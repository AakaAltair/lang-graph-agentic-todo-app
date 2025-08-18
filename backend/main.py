from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import the router objects from our api files
from .api import todos, chat
from . import models
from .database import engine
from fastapi import WebSocket, WebSocketDisconnect
from .websocket_manager import manager # <-- IMPORT our new manager

# Create the database tables
models.Base.metadata.create_all(bind=engine)

# Initialize the main FastAPI app instance
app = FastAPI(
    title="Agentic To-Do App API",
    description="API for a to-do application with an integrated AI agent.",
    version="1.0.0"
)

# --- CORS Middleware ---
# This remains at the top level, as it applies to all requests
origins = [
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Include Routers ---
# This is how we connect our organized endpoints back to the main app.
app.include_router(todos.router)
app.include_router(chat.router)


# Optional: Add a root endpoint for basic health checks
@app.get("/", tags=["Root"])
def read_root():
    return {"status": "ok", "message": "Welcome to the Agentic To-Do App API!"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # This loop keeps the connection alive.
        # You could also have it receive messages from the client if needed.
        while True:
            # We are just waiting for the client to disconnect.
            # The server is only broadcasting, not receiving from this client.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("Client disconnected from WebSocket.")