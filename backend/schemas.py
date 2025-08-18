from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# Shared properties
class TodoBase(BaseModel):
    title: str
    description: Optional[str] = None
    completed: bool = False

# Properties to receive on item creation
class TodoCreate(TodoBase):
    pass

# Properties to receive on item update
class TodoUpdate(TodoBase):
    pass

# Properties to return to client
class Todo(TodoBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True