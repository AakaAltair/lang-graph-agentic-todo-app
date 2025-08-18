# --- COMPLETE AND UPDATED CODE ---

from sqlalchemy.orm import Session
from . import models, schemas
# --- NEW: Import the LangChain embedding model ---
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# --- NEW: Initialize the Embedding Model ---
# This creates an instance of Google's model for generating embeddings.
# It's lightweight and designed specifically for this purpose.
try:
    embeddings_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
except Exception as e:
    print(f"Could not initialize embeddings model: {e}. Semantic search will not work.")
    embeddings_model = None

# --- NEW: Helper function to generate embeddings ---
def get_embedding_for_text(text: str):
    """
    Generates a vector embedding for a given piece of text using the initialized model.
    Returns None if the model failed to initialize.
    """
    if not embeddings_model:
        return None
    return embeddings_model.embed_query(text)


# --- UPDATED: create_new_todo ---
# Now also generates and saves the embedding.
def create_new_todo(db: Session, title: str, description: str = None):
    """
    Creates a new to-do item and also generates its vector embedding for semantic search.
    """
    # Combine title and description for a richer embedding context.
    full_text = f"Title: {title}"
    if description:
        full_text += f"\nDescription: {description}"
    
    # Generate the vector embedding for the combined text.
    embedding = get_embedding_for_text(full_text)
    
    db_todo = models.Todo(
        title=title, 
        description=description,
        embedding=embedding # Save the new embedding to the database.
    )
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo


# --- UPDATED: update_existing_todo ---
# Now regenerates the embedding if the title or description changes.
def update_existing_todo(db: Session, todo_id: int, title: str = None, description: str = None, completed: bool = None):
    """
    Updates an existing to-do item. If the title or description is changed,
    it regenerates the vector embedding to keep it in sync with the text.
    """
    db_todo = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
    if not db_todo:
        return None
    
    text_changed = False
    if title is not None:
        db_todo.title = title
        text_changed = True
    if description is not None:
        db_todo.description = description
        text_changed = True
    if completed is not None:
        db_todo.completed = completed
    
    # If the text was modified, we must create a new embedding.
    if text_changed:
        full_text = f"Title: {db_todo.title}\nDescription: {db_todo.description or ''}"
        db_todo.embedding = get_embedding_for_text(full_text)

    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo


# --- UNCHANGED: get_all_todos ---
# Your existing function for simple fetching and filtering.
def get_all_todos(db: Session, status: str = "all"):
    """
    Retrieves to-do items from the database with filtering by completion status.
    - status="all": Returns all to-dos.
    - status="completed": Returns only completed to-dos.
    - status="active": Returns only non-completed to-dos.
    """
    if status == "completed":
        return db.query(models.Todo).filter(models.Todo.completed == True).all()
    elif status == "active":
        return db.query(models.Todo).filter(models.Todo.completed == False).all()
    else:  # "all" or any other value will default to all
        return db.query(models.Todo).all()


# --- UNCHANGED: delete_existing_todo ---
# No changes are needed here as it doesn't involve embeddings.
def delete_existing_todo(db: Session, todo_id: int):
    """
    Deletes a to-do item from the database.
    """
    db_todo = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
    if not db_todo:
        return None
    db.delete(db_todo)
    db.commit()
    return db_todo