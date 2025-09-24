from sqlalchemy import Boolean, Column, Integer, String, DateTime
from sqlalchemy.sql import func
from .database import Base
from pgvector.sqlalchemy import Vector # <-- Import Vector type


class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, index=True, nullable=True)

    # The number (768) is the dimension of the embedding model we will use.
    embedding = Column(Vector(768))
    
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # --- THIS IS THE FIX ---
    # We add a `default` that is the same as the `server_default` for created_at.
    # The `onupdate` will still trigger correctly when the row is changed.
    updated_at = Column(
        DateTime(timezone=True),
        default=func.now(), # <-- Set initial value on creation
        onupdate=func.now()    # <-- Update value on any change
    )