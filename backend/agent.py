import os
import json
from typing import TypedDict, Annotated, Optional, List
from datetime import datetime, date, timedelta
from dateutil.parser import parse
from dateutil.relativedelta import relativedelta

# --- 3rd Party Imports ---
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import ToolNode

from langchain_core.tools import tool
# --- Local Imports ---
from . import crud, database, models
from .websocket_manager import manager
from .prompts import AGENT_SYSTEM_PROMPT # <-- Import the prompt

# ==============================================================================
# 1. TOOL DEFINITIONS (Consolidated and Refined)
# ==============================================================================

# --- Pydantic Schemas for Tool Arguments ---
class CreateTodoArgs(BaseModel):
    title: str = Field(..., description="The title of the to-do item.")
    description: Optional[str] = Field(None, description="An optional description for the to-do item.")

class UpdateTodoArgs(BaseModel):
    todo_id: int = Field(..., description="The ID of the to-do item to update.")
    new_title: Optional[str] = Field(None, description="The new title for the to-do.")
    new_description: Optional[str] = Field(None, description="The new description for the to-do.")
    completed: Optional[bool] = Field(None, description="The new completion status of the to-do.")

class DeleteMultipleTodosArgs(BaseModel):
    todo_ids: List[int] = Field(..., description="A list of specific to-do IDs to delete.")

class QueryTodosArgs(BaseModel):
    query: Optional[str] = Field(None, description="A semantic query to search by topic, e.g., 'school', 'friends', 'work project'.")
    status: Optional[str] = Field(None, description="Filter by status. Must be 'completed' or 'active'.")
    start_date: Optional[str] = Field(None, description="Start of date range. Accepts formats like 'YYYY-MM-DD' or natural language like 'yesterday', 'last week'.")
    end_date: Optional[str] = Field(None, description="End of date range. Accepts formats like 'YYYY-MM-DD' or 'today'.")

class PerformUIActionArgs(BaseModel):
    action: str = Field(..., description="The UI action to perform (e.g., 'navigate', 'set_theme').")
    payload: str = Field(..., description="The data for the action (e.g., '/settings', 'theme-solar').")


# --- Internal Helper Functions ---
async def _broadcast_command(command: dict):
    """Helper function to broadcast a JSON command via WebSocket."""
    if isinstance(command, dict) and "type" in command:
        print(f"Broadcasting command via WebSocket: {command}")
        await manager.broadcast(json.dumps(command))
    return "Broadcast successful."

def _parse_dates(start_date_str: Optional[str], end_date_str: Optional[str]) -> (Optional[datetime], Optional[datetime]):
    parsed_start, parsed_end = None, None
    now = datetime.now()
    try:
        if start_date_str:
            if 'yesterday' in start_date_str.lower(): parsed_start = now - timedelta(days=1)
            elif 'last week' in start_date_str.lower(): parsed_start = now - timedelta(weeks=1)
            elif 'last month' in start_date_str.lower(): parsed_start = now - relativedelta(months=1)
            else: parsed_start = parse(start_date_str)
        if end_date_str:
            if 'today' in end_date_str.lower(): parsed_end = now
            elif 'yesterday' in end_date_str.lower(): parsed_end = now - timedelta(days=1)
            else: parsed_end = parse(end_date_str)
    except Exception: pass
    return parsed_start, parsed_end

# --- Tools Exposed to the LLM ---
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
    if not todo: return f"Error: To-do with ID {todo_id} not found."
    return f"Successfully updated to-do with ID {todo.id}."

@tool(args_schema=DeleteMultipleTodosArgs)
def delete_multiple_todos(todo_ids: List[int]) -> str:
    """Deletes multiple to-do items at once using a specific list of their IDs."""
    db: Session = next(database.get_db())
    num_deleted = crud.delete_multiple_todos_by_ids(db, todo_ids=todo_ids)
    if num_deleted > 0: return f"Successfully deleted {num_deleted} to-do item(s)."
    return "No to-do items were found with the given IDs."

@tool
def delete_all_todos() -> str:
    """Deletes ALL to-do items. This is a highly destructive action and requires explicit user confirmation first."""
    db: Session = next(database.get_db())
    num_deleted = crud.delete_all_todos(db)
    return f"Successfully deleted all {num_deleted} to-do item(s)."

@tool(args_schema=QueryTodosArgs)
def query_todos(query: Optional[str] = None, status: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None) -> str:
    """Your primary tool for retrieving information about to-dos. It can filter by semantic query, completion status, and a date range all at once. Use this to answer ANY question about the user's to-dos, including counting them."""
    db: Session = next(database.get_db())
    parsed_start, parsed_end = _parse_dates(start_date, end_date)
    results = crud.query_database_todos(db, query=query, completed=(status == 'completed' if status else None), start_date=parsed_start, end_date=parsed_end, limit=200)
    if not results: return "No to-do items found matching the criteria."
    return json.dumps({ "count": len(results), "todos": [{"id": t.id, "title": t.title, "completed": t.completed} for t in results] })

@tool
def get_current_datetime() -> str:
    """Returns the current date and time."""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

@tool(args_schema=PerformUIActionArgs)
async def perform_ui_action(action: str, payload: str) -> str:
    """Performs a specific action on the frontend UI, such as navigation, changing settings, or applying filters."""
    # Special handling for custom date range to parse natural language
    if action == "set_custom_date_range":
        try:
            # The payload for this action is the user's raw text, e.g., "yesterday and today"
            start_str, end_str = payload.split("and")
            parsed_start, parsed_end = _parse_dates(start_str.strip(), end_str.strip())
            final_payload = {
                "startDate": parsed_start.strftime("%Y-%m-%d") if parsed_start else "",
                "endDate": parsed_end.strftime("%Y-%m-%d") if parsed_end else ""
            }
            command = {"type": "ui_action", "action": action, "payload": final_payload}
        except Exception:
            return "Error: Could not parse the date range. Please be more specific, like 'between date A and date B'."
    else:
      command = {"type": "ui_action", "action": action, "payload": payload}

    await _broadcast_command(command)
    return f"UI action '{action}' was successfully dispatched."


# ==============================================================================
# 2. LANGGRAPH AGENT SETUP
# ==============================================================================

tools = [
    create_todo, update_todo, delete_multiple_todos, delete_all_todos,
    query_todos, get_current_datetime, perform_ui_action,
]
tool_node = ToolNode(tools)

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.1)
llm_with_tools = llm.bind_tools(tools)

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], lambda x, y: x + y]

def should_continue(state: AgentState) -> str:
    last_message = state['messages'][-1]
    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        return "end"
    return "continue"

def call_model(state: AgentState):
    # Prepend the system prompt to the message history.
    messages_with_prompt = [HumanMessage(content=AGENT_SYSTEM_PROMPT)] + state['messages']
    response = llm_with_tools.invoke(messages_with_prompt)
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
    config = {"configurable": {"thread_id": thread_id}}
    was_modifying_tool_used = False
    modifying_tools = {"create_todo", "update_todo", "delete_multiple_todos", "delete_all_todos"}

    async for event in app.astream_events(inputs, config=config, version="v2"):
        kind = event["event"]
        if kind == "on_tool_end" and event["name"] in modifying_tools:
            was_modifying_tool_used = True
        if kind == "on_chain_end" and event["name"] == "agent":
            final_message = event["data"]["output"]["messages"][-1]
            if final_message.content:
                yield final_message.content
    
    if was_modifying_tool_used:
        print("Modifying tool used, broadcasting 'data_update' message.")
        update_command = {"type": "data_update", "payload": "todos_updated"}
        await _broadcast_command(update_command)