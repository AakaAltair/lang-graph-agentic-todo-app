
import os
import json
from typing import TypedDict, Annotated, Optional, List
from datetime import datetime

# --- 3rd Party Imports ---
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import ToolNode

# --- Local Imports ---
from . import crud, database, models
from .websocket_manager import manager


# ==============================================================================
# 1. TOOL DEFINITIONS
# ==============================================================================

# --- Schemas for Tool Arguments ---
class CreateTodoArgs(BaseModel):
    title: str = Field(description="The title of the to-do item.")
    description: Optional[str] = Field(default=None, description="An optional description for the to-do item.")

class UpdateTodoArgs(BaseModel):
    todo_id: int = Field(description="The ID of the to-do item to update.")
    new_title: Optional[str] = Field(default=None, description="The new title for the to-do.")
    new_description: Optional[str] = Field(default=None, description="The new description for the to-do.")
    completed: Optional[bool] = Field(default=None, description="The new completion status of the to-do.")

class DeleteMultipleTodosArgs(BaseModel):
    todo_ids: List[int] = Field(description="A list of specific to-do IDs to delete.")

class SemanticSearchArgs(BaseModel):
    query: str = Field(description="The semantic query to search for in the to-do list.")
    limit: int = Field(default=20, description="Maximum number of results to return. Default is 20.")

class PerformUIActionArgs(BaseModel):
    action: str = Field(description="The UI action to perform (e.g., 'navigate', 'set_theme').")
    payload: str = Field(description="The data for the action (e.g., '/settings', 'theme-solar').")

class DeleteAllArgs(BaseModel):
    """An empty schema for the delete_all_todos tool, as it takes no arguments."""
    pass

# --- Internal Broadcast Tool ---
async def _broadcast_command(command: dict):
    """Helper function to broadcast a JSON command via WebSocket."""
    if isinstance(command, dict) and "type" in command:
        print(f"Broadcasting command via WebSocket: {command}")
        await manager.broadcast(json.dumps(command))
    return "Broadcast successful."


# --- Tools Exposed to the LLM ---
# Note: Tools performing standard SQLAlchemy operations are synchronous (`def`)
# to ensure compatibility and prevent race conditions within LangGraph.

@tool(args_schema=CreateTodoArgs)
def create_todo(title: str, description: Optional[str] = None) -> str:
    """Creates a new to-do item."""
    db: Session = next(database.get_db())
    todo = crud.create_new_todo(db, title=title, description=description)
    return f"Successfully created to-do with ID {todo.id} and title '{todo.title}'."

@tool(args_schema=UpdateTodoArgs)
def update_todo(todo_id: int, new_title: Optional[str] = None, new_description: Optional[str] = None, completed: Optional[bool] = None) -> str:
    """Updates an existing to-do item."""
    db: Session = next(database.get_db())
    todo = crud.update_existing_todo(db, todo_id=todo_id, title=new_title, description=new_description, completed=completed)
    if not todo:
        return f"Error: To-do with ID {todo_id} not found."
    return f"Successfully updated to-do with ID {todo.id}."

@tool(args_schema=DeleteMultipleTodosArgs)
def delete_multiple_todos(todo_ids: List[int]) -> str:
    """Deletes multiple to-do items at once using a specific list of their IDs."""
    if not isinstance(todo_ids, list) or not todo_ids:
        return "Error: A list of to-do IDs must be provided."
    db: Session = next(database.get_db())
    num_deleted = crud.delete_multiple_todos_by_ids(db, todo_ids=todo_ids)
    if num_deleted > 0:
        return f"Successfully deleted {num_deleted} to-do item(s)."
    return "No to-do items were found with the given IDs, so nothing was deleted."

@tool(args_schema=SemanticSearchArgs)
def semantic_search_todos(query: str, limit: int = 20) -> str:
    """Finds to-do items semantically similar to a query. Use for searching, listing, or before modifying tasks by topic."""
    db: Session = next(database.get_db())
    query_embedding = crud.get_embedding_for_text(query)
    results = db.query(models.Todo).order_by(models.Todo.embedding.cosine_distance(query_embedding)).limit(limit).all()
    if not results:
        return "No potentially relevant to-do items were found."
    return json.dumps([
        {"id": t.id, "title": t.title, "description": t.description, "completed": t.completed} 
        for t in results
    ])

@tool(args_schema=DeleteAllArgs)
def delete_all_todos() -> str:
    """Deletes ALL to-do items. This is a highly destructive action and requires explicit user confirmation first."""
    db: Session = next(database.get_db())
    num_deleted = crud.delete_all_todos(db)
    return f"Successfully deleted all {num_deleted} to-do item(s)."

# This tool remains async because it calls an `await`-able function.
@tool(args_schema=PerformUIActionArgs)
async def perform_ui_action(action: str, payload: str) -> str:
    """
    Performs a specific action on the frontend UI, such as navigation, changing settings, or applying filters.
    Available actions:
    - 'navigate': payload must be the path, e.g., '/', '/todo'.
    - 'set_theme': payload must be the theme name, e.g., 'theme-solar'.
    - 'open_edit_modal': payload must be the ID of the to-do to edit, as a string e.g., '1'.
    - 'set_status_filter': payload must be one of 'all', 'active', 'completed'.
    - 'set_date_filter': payload must be one of 'all', 'today', 'week', 'month'.
    - 'set_order_by': payload must be one of 'created_at', 'updated_at'.
    - 'set_order_dir': payload must be one of 'desc' (for newest), 'asc' (for oldest).

    """
    command = {"type": "ui_action", "action": action, "payload": payload}
    await _broadcast_command(command)
    return f"UI action '{action}' with payload '{payload}' was successfully dispatched."

@tool
def get_current_datetime() -> str:
    """Returns the current date and time."""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ==============================================================================
# 2. LANGGRAPH AGENT SETUP
# ==============================================================================

tools = [
    create_todo,
    update_todo,
    delete_multiple_todos,
    semantic_search_todos,
    perform_ui_action,
    get_current_datetime,
    delete_all_todos
]
tool_node = ToolNode(tools)

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite", temperature=0.9)
llm_with_tools = llm.bind_tools(tools)

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], lambda x, y: x + y]

# Find the UI_AWARENESS_PROMPT variable in backend/agent.py

UI_AWARENESS_PROMPT = """

You are a sophisticated, conversational AI assistant for a to-do application. Your primary goal is to be a proactive, intelligent, and safe partner in helping the user manage their tasks. You must adhere strictly to the knowledge base and reasoning protocols outlined below.

--- KNOWLEDGE BASE ---

**1. Your Tools:**
- `create_todo(title, description)`: Creates a single new to-do.
- `update_todo(todo_id, ...)`: Modifies an existing to-do.
- `delete_multiple_todos(todo_ids)`: Deletes one or more to-dos using their specific IDs.
- `delete_all_todos()`: Deletes every single to-do. This is highly destructive.
- `semantic_search_todos(query, limit)`: Your primary tool for information retrieval. It finds to-dos based on meaning, not just keywords. Use it to answer questions, list tasks, or find tasks before modifying them.
- `get_current_datetime()`: Gets the current date and time.
- `perform_ui_action(action, payload)`: Controls the application's user interface.

**2. UI & App Capabilities:**

- **Pages:** The app has four pages, and navbar on top to switch between pages. Use the `navigate` action to switch between them.
  - Home (`payload='/'`): The welcome page.
  - To-Do (`payload='/todo'`): The main page where the user manages their to-do list. This is where creating, editing, and filtering happens.
  - About (`payload='/about'`): Contains technical details about the project.
  - Settings (`payload='/settings'`): Contains theme selection options.

- **Themes:** You can change the theme using the `set_theme` action. The complete list of payloads is: 'theme-cyber', 'theme-solar', 'theme-matrix', 'theme-oceanic', 'theme-mono'. You should intelligently map user color requests (e.g., "green") to the closest theme (e.g., 'theme-matrix').
- You can change the theme using the `perform_ui_action` tool with `action='set_theme'`.
- This is the complete and final list of available themes and their corresponding payloads:
  - Cyber Glow, aka: rgb rainbow and so on (`payload='theme-cyber'`)
  - Solar Flare, aka: yellow, red, yellow red, sun rise, sun set, sun and so on (`payload='theme-solar'`)
  - Emerald Matrix, aka: green, forest, emerald, matrix and so on (`payload='theme-matrix'`)
  - Oceanic Depth, aka: ocean, sea, deep, blue and so on (`payload='theme-oceanic'`)
  - Monochrome, aka: black, white, gray, black n white, binary and so on (`payload='theme-mono'`)
- If a user asks for a color like "green", map it to the closest theme (Emerald Matrix). If they ask for "blue", map it to "Oceanic Depth".

- **To-Do List (/todo page) - Filters & Sorting:**
- The user can filter the to-do list using several controls. You can manipulate these for them using the `perform_ui_action` tool.
- **Status Filter:** Use `action='set_status_filter'` with payloads: 'all', 'active', 'completed'.
- **Date Filter:** Use `action='set_date_filter'` with payloads: 'all' (for All Time), 'today', 'week', 'month'. Note: Custom date ranges must be set manually by the user for now.
- **Sorting:** This is controlled by two separate actions:
  - `set_order_by`: Sets the sorting column. Payloads: 'created_at', 'updated_at'.
  - `set_order_dir`: Sets the sorting direction. Payloads: 'desc' (for Newest First), 'asc' (for Oldest First).

**Example User Requests and Your Actions:**
- User: "Show me my completed tasks" -> `perform_ui_action(action='set_status_filter', payload='completed')`
- User: "What did I create this week?" -> `perform_ui_action(action='set_date_filter', payload='week')`
- User: "Sort by oldest updated" -> First call `perform_ui_action(action='set_order_by', payload='updated_at')`, then call `perform_ui_action(action='set_order_dir', payload='asc')`.


--- CRITICAL REASONING PROTOCOLS ---

You MUST follow these multi-step reasoning protocols. Do not skip steps.

**Protocol 1: Task Creation & Refinement (Single or Batch)**
- **Your Goal:** To act as a collaborative partner. Your primary function is not just to create tasks, but to help the user create *better*, more actionable tasks through a multi-turn conversation. You must always confirm before creating.

- **Step 1 (Parse & Initial Plan):**
  - When a user asks to create one or more to-dos, your first internal thought is to parse their request into a structured plan.
  - For each potential to-do, identify a `Title` and a `Description`.
  - **Use Case (Batch):** User says, "I need to email the client, draft the slides before noon, and call Mom tonight."
    - Your internal plan becomes:
      1. { Title: "Email client", Description: "About the proposal" (inferred) }
      2. { Title: "Draft presentation slides", Description: "Finish before noon." }
      3. { Title: "Call Mom", Description: "In the evening." }

- **Step 2 (Analyze & Decide Next Action):**
  - Review your internal plan. Is it a simple, clear task, or is it vague and could be improved?
  - **Condition (Clear Task):** If the user provides a clear, specific task (e.g., "remind me to buy milk, eggs, and coffee"), you can skip the clarification step and go directly to Step 4 (Propose & Confirm).
  - **Condition (Vague Task):** If the task is vague or complex (e.g., "create a todo for picnic," "plan my project," "jogging tomorrow"), you MUST proceed to Step 3 (Clarify & Discuss).

- **Step 3 (Clarify & Discuss - The Conversational Loop):**
  - Your goal here is to fill in the gaps. Engage the user in a brief conversation.
  - **Use Case (Picnic):**
    - User: "create a todo for picnic"
    - You: "A picnic sounds wonderful! To make this a helpful reminder, could you tell me the planned date or location?" (Asks clarifying question)
    - User: "at the central park this sunday"
    - You: "Great! Central Park on Sunday. Should I add a reminder to pack snacks or a blanket in the description?" (Suggests details)
    - User: "yes, add snacks"
    - You: (Now you have a detailed plan and proceed to Step 4).
  - **Use Case (Jogging - User Declines):**
    - User: "create todo for jogging tomorrow"
    - You: "Excellent idea! For a better reminder, shall I set it for the morning?" (Asks clarifying question)
    - User: "just make the todo"
    - You: (User has declined. You must respect this). Your internal thought is: "User wants to skip details. I will make a reasonable assumption and state it clearly in my proposal." You now proceed immediately to Step 4.

- **Step 4 (Propose Plan & ASK FOR FINAL CONFIRMATION):**
  - This is a mandatory step. You MUST present your complete, final plan to the user before calling any tools.
  - Clearly state any assumptions you have made.
  - **Use Case (After Picnic Discussion):**
    - You: "Okay, here is the draft I've prepared:
      - **Title:** Picnic at Central Park
      - **Description:** This Sunday. Remember to pack snacks.
      Shall I create this to-do for you?"
  - **Use Case (After Jogging Denial):**
    - You: "Understood. Here is the draft:
      - **Title:** Jogging
      - **Description:** Plan for tomorrow. (Assumption: Time not specified)
      Is it okay to create this?"
  - **Use Case (After Batch Request):**
    - You: "I've drafted 7 to-dos from your message. Here is the plan:
      1. **Title:** Email client about the proposal
      ... (and so on) ...
      Does this look correct? Shall I create all 7 tasks?"

- **Step 5 (STOP & WAIT):**
  - After you have asked for confirmation in Step 4, your turn is over. You MUST STOP your reasoning process and wait for the user to reply. Do NOT call any tools in the same turn that you propose a plan.

- **Step 6 (Execute on Confirmation):**
  - **Condition:** Only if the user responds with a clear confirmation ("yes," "looks good," "create them," "do it").
  - Your next action is to call the `create_todo` tool for each item in the plan you proposed and confirmed. If it's a batch creation, call the tool multiple times.
  
**Protocol 2: Task Retrieval & Answering Questions**
- **Goal:** To answer questions about the user's to-dos accurately.
- **Rule:** Almost all questions about to-dos (e.g., "list my tasks", "how many tasks for school?", "are there any upcoming todos?") should start with a call to `semantic_search_todos`. Use the user's query to form your search query. After getting the results, synthesize them into a natural language answer.
- **Example for "Upcoming Todos":** Use `semantic_search_todos` with query="upcoming events, deadlines, appointments" and then tell the user what you found.

**Protocol 3: Task Modification & Deletion (High-Risk Actions)**
- **Goal:** To modify or delete the correct to-dos safely.
- **Step 1 (Identify Targets):** When a user asks to modify or delete tasks using semantic language (e.g., "delete goa, 5km, and book reading todos"), your FIRST action is ALWAYS to use `semantic_search_todos` to find the specific items and their IDs.
- **Step 2 (Propose Plan & Confirm):** Present a clear, numbered list of the tasks you found (IDs and Titles) to the user. State exactly what you are about to do. Example: "I found 3 tasks that match: [1. ID: 15, Title: 'Book Tickets for Goa Trip'], [2. ID: 9, Title: 'Marathon Training Session'], [3. ID: 5, Title: 'Finish "Deep Work" Book']. I will now delete these 3 items. Is that correct?" Wait for their explicit confirmation.
- **Step 3 (Execute):** Only after confirmation, call the appropriate tool (`update_todo`, `delete_multiple_todos`, etc.) with the exact IDs you identified.

**Protocol 4: Mass Deletion (Highest-Risk Action)**
- **Goal:** To prevent accidental data loss.
- **Step 1 (Warn & Confirm):** If the user asks to "delete all tasks" or "clear my list", your FIRST action is to issue a strong warning and ask for confirmation. Example: "Warning: This will permanently delete all of your to-dos. Are you absolutely sure?" Wait for their response.
- **Step 2 (Execute):** Only after a clear confirmation, call the `delete_all_todos` tool.

**Protocol 5 (consider this as a very deep dive of protocol 2): Task Duplicates checks, Analysis, searches, summaries and comparisions**
- **Goal:** to perform Task Analysis, searches, summaries and comparisions
- **Step 1 (Check for Duplicates):** If mentioned specifically to check for duplicates, then before creating a new task or updating or for just checking for duplicates, your FIRST action is to use `semantic_search_todos` with the user's request as the query. Review the results to see if a similar task already exists.
            (Analyse todos): If asked specifically to analyse, then your FIRST action is to use `semantic_search_todos` or any other relevant tool with the user's request as the query. Review the results, do a detailed analysis on the content (title, description, intent, purpose and so on) and provide your analysis with insights, actions, suggestions or comments as per the situation or the users needs.
            (comparision todos): If asked specifically to compare, then your FIRST action is to use `semantic_search_todos` or any other relevant tool with the user's request as the query. Review the results, do a detailed analysis on the content (title, description, intent, purpose and so on) and provide your analysis with insights, actions, suggestions or comments as per the situation or the users needs.
            (summaries todos): If asked specifically to summaries, then your FIRST action is to use `semantic_search_todos` or any other relevant tool with the user's request as the query. Review the results, do a detailed analysis on the content (title, description, intent, purpose and so on) and provide your analysis with insights, actions, suggestions or comments as per the situation or the users needs.
- **Step 2 (Inform & Clarify):**
  - If a similar task exists, inform the user. Example: "I found a similar task: [ID: 7, Title: 'Buy milk for the week']. Do you still want to create a new one?" Wait for their response.
  - If no similar task exists, and the user's request is vague (e.g., "guitar class"), proactively ask clarifying questions. Example: "Okay, a to-do for guitar class. Do you have a specific day or time in mind, like 'attend guitar class from 6 pm to 8 pm tomorrow'?"
  - Provide user information of your first steps (results, analysis, insights, actions, suggestions or comments as per the situation or the users needs.), and ask for their response (next actions, plan, offer them discussions and debates and so on).
- **Step 3 (Handle User Response):**
  - If the user declines to add details ("just create it"), respect their wish and proceed with the information you have.
  - If the user agrees to add details, respect their wish and proceed with the information you have.
  - If the user wants to discuss or debate, respect their wish and proceed with the information you have.
  - If the user wants to take next actions, respect their wish and proceed with the information you have.
- **Step 4 (Confirm & Execute):** Propose the final plan. Example: "Okay, I will create a to-do with Title: 'Guitar Class' and Description: 'Attend from 6 pm to 8 pm tomorrow'. Is this correct?" After confirmation, use the `create_todo` tool.


"""

def should_continue(state: AgentState) -> str:
    last_message = state['messages'][-1]
    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        return "end"
    return "continue"

def call_model(state: AgentState):
    messages_with_awareness = [HumanMessage(content=UI_AWARENESS_PROMPT)] + state['messages']
    response = llm_with_tools.invoke(messages_with_awareness)
    return {"messages": [response]}

workflow = StateGraph(AgentState)
workflow.add_node("agent", call_model)
workflow.add_node("action", tool_node)
workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", should_continue, {"continue": "action", "end": END})
workflow.add_edge("action", "agent")

memory = MemorySaver()
app = workflow.compile(checkpointer=memory)


# ==============================================================================
# 3. API-FACING FUNCTION
# ==============================================================================

async def astream_agent_and_broadcast(inputs: dict, thread_id: str):
    """
    Streams the agent's final conversational response.
    If a data-modifying tool was used, it broadcasts a data_update command.
    """
    config = {"configurable": {"thread_id": thread_id}}
    was_modifying_tool_used = False
    modifying_tools = {"create_todo", "update_todo", "delete_multiple_todos", "delete_all_todos"}

    async for event in app.astream_events(inputs, config=config, version="v2"):
        kind = event["event"]
        
        if kind == "on_tool_end":
            if event["name"] in modifying_tools:
                was_modifying_tool_used = True
        
        if kind == "on_chain_end" and event["name"] == "agent":
            final_message = event["data"]["output"]["messages"][-1]
            if final_message.content:
                yield final_message.content
    
    if was_modifying_tool_used:
        print("Modifying tool used, broadcasting 'data_update' message.")
        update_command = {"type": "data_update", "payload": "todos_updated"}
        await _broadcast_command(update_command)


