from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Correctly import the agent module from the parent directory
from .. import agent
# Import the message type LangGraph expects
from langchain_core.messages import HumanMessage

# --- Router Setup ---
# All endpoints in this file will be prefixed with /chat and tagged as "Chat" in the docs.
router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)

# --- Request Model ---
# Defines the structure of the JSON body the frontend must send.
class ChatRequest(BaseModel):
    message: str
    thread_id: str

# --- API Endpoint ---
@router.post("/")
async def chat_with_ai_streaming_endpoint(request: ChatRequest):
    """
    Handles a chat request by invoking the LangGraph agent.
    
    This endpoint:
    1. Receives a message and a conversation thread_id.
    2. Calls the agent's main streaming function.
    3. Streams the conversational text back to the client via HTTP.
    4. Relies on the agent's internal tools to handle UI commands and data updates
       out-of-band via a separate WebSocket channel.
    """
    try:
        # Prepare the input for the LangGraph agent in the required dictionary format.
        # The 'messages' key must match the key in our AgentState.
        inputs = {"messages": [HumanMessage(content=request.message)]}
        
        # Return a StreamingResponse. This takes our async generator from the agent
        # and streams its yielded chunks back to the frontend as they become available.
        return StreamingResponse(
            agent.astream_agent_and_broadcast(inputs=inputs, thread_id=request.thread_id),
            media_type="text/plain"
        )
    except Exception as e:
        # A robust error handler for any unexpected issues during agent execution.
        print(f"An error occurred in the chat endpoint: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process chat request: {str(e)}"
        )