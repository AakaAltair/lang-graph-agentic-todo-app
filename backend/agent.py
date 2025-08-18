import os
import json
from typing import TypedDict, Annotated, Optional, List

# --- 3rd Party Imports ---
from sqlalchemy.orm import Session
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

# --- Internal Broadcast Tool ---
# This is a helper function and is NOT exposed to the LLM as a tool.
async def _broadcast_command(command: dict):
    """Helper function to broadcast a JSON command via WebSocket."""
    if isinstance(command, dict) and "type" in command:
        print(f"Broadcasting command via WebSocket: {command}")
        await manager.broadcast(json.dumps(command))
        return "Broadcast successful."
    return "Invalid command format for broadcast."


# --- Tools Exposed to the LLM ---

@tool
async def create_todo(title: str, description: str = None) -> str:
    """Creates a new to-do item with a title and an optional description."""
    db: Session = next(database.get_db())
    todo = crud.create_new_todo(db, title=title, description=description)
    return f"Successfully created to-do with ID {todo.id} and title '{todo.title}'."

@tool
async def update_todo(todo_id: int, new_title: str = None, new_description: str = None, completed: bool = None) -> str:
    """Updates an existing to-do item's title, description, or completed status, identified by its ID."""
    db: Session = next(database.get_db())
    todo = crud.update_existing_todo(db, todo_id=todo_id, title=new_title, description=new_description, completed=completed)
    if not todo:
        return f"Error: To-do with ID {todo_id} not found."
    return f"Successfully updated to-do with ID {todo.id}."

@tool
async def delete_todo(todo_id: int) -> str:
    """Deletes a to-do item, identified by its ID."""
    db: Session = next(database.get_db())
    todo = crud.delete_existing_todo(db, todo_id=todo_id)
    if not todo:
        return f"Error: To-do with ID {todo_id} not found."
    return f"Successfully deleted to-do with ID {todo.id} '{todo.title}'."

@tool
async def semantic_search_todos(query: str) -> str:
    """
    Finds to-do items that are semantically similar to the user's query.
    Use this for questions about topics, concepts, or plans.
    For example: 'tasks related to school', 'plans with friends', 'what should I pack for my trip?'.
    Also use this as a first step to get context if the user asks to modify or list todos.
    """
    db: Session = next(database.get_db())
    query_embedding = crud.get_embedding_for_text(query)
    results = db.query(models.Todo).order_by(models.Todo.embedding.l2_distance(query_embedding)).limit(5).all()
    if not results:
        return "No to-do items found that seem related to the query."
    return "\n".join([f"- ID: {t.id}, Title: '{t.title}', Completed: {t.completed}" for t in results])

@tool
async def perform_ui_action(action: str, payload: str) -> str:
    """
    Performs a specific action on the frontend UI, such as navigation or changing settings.
    Available actions:
    - 'navigate': payload must be the path, e.g., '/', '/todo', '/settings', '/about'.
    - 'set_theme': payload must be the theme name, e.g., 'theme-solar', 'theme-matrix', 'theme-cyber'.
    - 'open_edit_modal': payload must be the ID of the to-do to edit, as a string e.g., '1', '23'.
    """
    # 1. Format the command.
    command = {"type": "ui_action", "action": action, "payload": payload}
    
    # 2. Broadcast the command using our internal helper. This is the key change.
    await _broadcast_command(command)
    
    # 3. Return a simple success message for the LLM to use in its final conversational response.
    return f"UI action '{action}' with payload '{payload}' was successfully dispatched."


# ==============================================================================
# 2. LANGGRAPH AGENT SETUP
# ==============================================================================

tools = [create_todo, update_todo, delete_todo, semantic_search_todos, perform_ui_action]
tool_node = ToolNode(tools)

llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.1)
llm_with_tools = llm.bind_tools(tools)

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], lambda x, y: x + y]

UI_AWARENESS_PROMPT = """
You have awareness of the User Interface (UI) of the application.
Here is a description of the UI components and how to interact with them:
- **Pages:** The app has four main pages: Home ('/'), To-Do ('/todo'), About ('/about'), and Settings ('/settings'). You can navigate between them using the 'navigate' action.
- **Themes:** On the Settings page, the user can change themes. You can change the theme for them using the 'set_theme' action. Available themes are: 'theme-cyber', 'theme-solar', 'theme-matrix', 'theme-oceanic', 'theme-mono'.
- **To-Do List (/todo page):**
  - **Filters:** Buttons labeled "All", "Active", "Completed" filter the list. You can explain this.
  - **Marking Complete:** Users click the checkbox next to a to-do.
  - **Editing:** Users click the pencil icon. You can also open this for them using the 'open_edit_modal' action with the to-do's ID.
  - **Deleting:** Users click the trash can icon.
When a user asks "how do I..." or "where is...", use this knowledge. If they ask you to perform an action, use the 'perform_ui_action' tool.
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
# 3. API-FACING FUNCTION (Simplified and Corrected)
# ==============================================================================

async def astream_agent_and_broadcast(inputs: dict, thread_id: str):
    """
    Streams the agent's final conversational response.
    If a data-modifying tool was used during the run, it broadcasts a data_update command.
    """
    config = {"configurable": {"thread_id": thread_id}}
    was_modifying_tool_used = False
    modifying_tools = {"create_todo", "update_todo", "delete_todo"}

    # Use astream_events for granular control and visibility.
    async for event in app.astream_events(inputs, config=config, version="v2"):
        kind = event["event"]
        
        if kind == "on_tool_end":
            if event["name"] in modifying_tools:
                was_modifying_tool_used = True
        
        # Stream the tokens from the LLM's final response as they come in.
        # This targets the final "agent" node after all tool calls are complete.
        if kind == "on_chain_end" and event["name"] == "agent":
            final_message = event["data"]["output"]["messages"][-1]
            if final_message.content:
                yield final_message.content
    
    # After the entire stream is finished, if a modifying tool was used, broadcast the update.
    if was_modifying_tool_used:
        print("Modifying tool used, broadcasting 'data_update' message.")
        update_command = {"type": "data_update", "payload": "todos_updated"}
        await _broadcast_command(update_command)