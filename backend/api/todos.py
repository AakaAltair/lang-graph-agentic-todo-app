from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

# Note the relative imports - we are one level deeper now
from .. import crud, schemas
from ..database import get_db

# 1. Create an APIRouter instance
router = APIRouter(
    prefix="/todos",  # All routes in this file will start with /todos
    tags=["Todos"]    # Group these endpoints in the API docs
)

# --- CREATE ---
@router.post("/", response_model=schemas.Todo, status_code=201)
def create_todo_endpoint(todo: schemas.TodoCreate, db: Session = Depends(get_db)):
    """
    Create a new to-do item.
    """
    return crud.create_new_todo(db=db, title=todo.title, description=todo.description)

# --- READ (List) ---
# This is the endpoint that has been updated.
@router.get("/", response_model=List[schemas.Todo])
def read_todos_endpoint(
    db: Session = Depends(get_db),
    # Use `Query` to define and validate the new sorting parameters.
    # The frontend will send these as part of the URL, e.g., /todos/?order_by=updated_at&order_dir=asc
    order_by: str = Query(
        default='created_at', 
        enum=['created_at', 'updated_at'],
        description="Field to order the results by."
    ),
    order_dir: str = Query(
        default='desc', 
        enum=['asc', 'desc'],
        description="Direction to order the results ('asc' for ascending, 'desc' for descending)."
    )
):
    """
    Retrieve all to-do items, with optional sorting.
    """
    # Pass the validated parameters to the underlying CRUD function.
    return crud.get_all_todos(db=db, order_by=order_by, order_dir=order_dir)

# --- READ (Single) ---
@router.get("/{todo_id}", response_model=schemas.Todo)
def read_todo_endpoint(todo_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a single to-do item by its ID.
    """
    # This logic is simple enough to live here, or could be moved to crud.py
    # We need to access the model via `schemas.models` if we're not importing `models` directly
    db_todo = db.query(schemas.models.Todo).filter(schemas.models.Todo.id == todo_id).first()
    if db_todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return db_todo

# --- UPDATE ---
@router.put("/{todo_id}", response_model=schemas.Todo)
def update_todo_endpoint(todo_id: int, todo: schemas.TodoUpdate, db: Session = Depends(get_db)):
    """
    Update a to-do item's title, description, or completed status.
    """
    # The `todo` object from the request body contains all possible fields to update.
    # We unpack it to pass the values to our CRUD function.
    db_todo = crud.update_existing_todo(
        db=db, 
        todo_id=todo_id, 
        title=todo.title, 
        description=todo.description, 
        completed=todo.completed
    )
    if db_todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return db_todo

# --- DELETE ---
@router.delete("/{todo_id}", response_model=schemas.Todo)
def delete_todo_endpoint(todo_id: int, db: Session = Depends(get_db)):
    """
    Delete a to-do item by its ID.
    """
    db_todo = crud.delete_existing_todo(db=db, todo_id=todo_id)
    if db_todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return db_todo

class SemanticSearchRequest(BaseModel):
    query: str
    limit: int = 20

@router.post("/semantic-search", response_model=List[schemas.Todo])
def semantic_search_endpoint(request: SemanticSearchRequest, db: Session = Depends(get_db)):
    """
    Performs a semantic search and returns the full to-do objects.
    """
    results = crud.semantic_search_with_date_filter(db, query=request.query, limit=request.limit)
    return results