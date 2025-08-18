from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

# Note the relative imports - we are one level deeper now
from .. import crud, schemas
from ..database import get_db

# 1. Create an APIRouter instance
router = APIRouter(
    prefix="/todos",  # 2. All routes in this file will start with /todos
    tags=["Todos"]    # 3. Group these endpoints in the API docs
)

# 4. Use the router to define endpoints, just like with `app`
@router.post("/", response_model=schemas.Todo, status_code=201)
def create_todo_endpoint(todo: schemas.TodoCreate, db: Session = Depends(get_db)):
    """
    Create a new to-do item.
    """
    return crud.create_new_todo(db=db, title=todo.title, description=todo.description)

@router.get("/", response_model=List[schemas.Todo])
def read_todos_endpoint(db: Session = Depends(get_db)):
    """
    Retrieve all to-do items.
    """
    return crud.get_all_todos(db=db)

@router.get("/{todo_id}", response_model=schemas.Todo)
def read_todo_endpoint(todo_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a single to-do item by its ID.
    """
    # This logic is simple enough to live here, or could be moved to crud.py
    db_todo = db.query(schemas.models.Todo).filter(schemas.models.Todo.id == todo_id).first()
    if db_todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return db_todo

@router.put("/{todo_id}", response_model=schemas.Todo)
def update_todo_endpoint(todo_id: int, todo: schemas.TodoUpdate, db: Session = Depends(get_db)):
    """
    Update a to-do item's title, description, or completed status.
    """
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

@router.delete("/{todo_id}", response_model=schemas.Todo)
def delete_todo_endpoint(todo_id: int, db: Session = Depends(get_db)):
    """
    Delete a to-do item by its ID.
    """
    db_todo = crud.delete_existing_todo(db=db, todo_id=todo_id)
    if db_todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return db_todo