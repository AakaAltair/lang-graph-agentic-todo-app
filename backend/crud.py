import re
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc # <-- 1. Import `desc` and `asc` for sorting
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_google_genai._common import GoogleGenerativeAIError

from . import models

# --- Initialize the Embedding Model ---
# This is a lightweight model specifically for creating text embeddings.
embeddings_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

def get_embedding_for_text(text: str):
    """Generates a vector embedding for a given piece of text, handling potential API errors."""
    try:
        return embeddings_model.embed_query(text)
    except GoogleGenerativeAIError as e:
        print(f"Could not generate embedding due to API error: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred during embedding: {e}")
        return None

def create_new_todo(db: Session, title: str, description: str = None):
    """Creates a new to-do and generates its vector embedding if possible."""
    meaningful_text = title
    if description:
        meaningful_text += f". {description}"
    
    emoji_pattern = re.compile("[\U00010000-\U0001FFFF]", flags=re.UNICODE)
    clean_text = emoji_pattern.sub(r'', meaningful_text)
    
    embedding = get_embedding_for_text(clean_text)
    
    db_todo = models.Todo(
        title=title, 
        description=description,
        embedding=embedding
    )
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo

def update_existing_todo(db: Session, todo_id: int, title: str = None, description: str = None, completed: bool = None):
    """Updates a to-do and regenerates its embedding if text changes and if possible."""
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
    
    if text_changed:
        meaningful_text = db_todo.title
        if db_todo.description:
            meaningful_text += f". {db_todo.description}"
        
        emoji_pattern = re.compile("[\U00010000-\U0001FFFF]", flags=re.UNICODE)
        clean_text = emoji_pattern.sub(r'', meaningful_text)
        
        embedding = get_embedding_for_text(clean_text)
        if embedding:
            db_todo.embedding = embedding

    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo

# --- 2. THIS IS THE MODIFIED FUNCTION ---
def get_all_todos(db: Session, order_by: str, order_dir: str):
    """Retrieves all to-do items from the database with dynamic sorting."""
    query = db.query(models.Todo)

    # Determine the column to sort by based on the `order_by` parameter
    if order_by == 'updated_at':
        sort_column = models.Todo.updated_at
    else: # Default to sorting by 'created_at'
        sort_column = models.Todo.created_at

    # Determine the direction of the sort (ascending or descending)
    if order_dir == 'asc':
        query = query.order_by(asc(sort_column))
    else: # Default to descending (newest first)
        query = query.order_by(desc(sort_column))

    return query.all()


def delete_multiple_todos_by_ids(db: Session, todo_ids: List[int]) -> int:
    """Deletes multiple to-do items from the database based on a list of their IDs."""
    num_deleted = db.query(models.Todo).filter(models.Todo.id.in_(todo_ids)).delete(synchronize_session=False)
    db.commit()
    return num_deleted

def delete_all_todos(db: Session) -> int:
    """Deletes all to-do items from the database. Returns the number of items deleted."""
    num_deleted = db.query(models.Todo).delete()
    db.commit()
    return num_deleted

def delete_existing_todo(db: Session, todo_id: int):
    """Deletes a single to-do item from the database by its ID."""
    # Find the specific to-do item
    db_todo = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
    
    # If it doesn't exist, we can't delete it.
    if not db_todo:
        return None
        
    # If found, delete it and commit the change.
    db.delete(db_todo)
    db.commit()
    
    # Return the deleted object so the API can confirm what was deleted.
    return db_todo

def semantic_search_with_date_filter(db: Session, query: str, limit: int, days_ago: Optional[int] = None) -> List[models.Todo]:
    """Performs a semantic search with an optional date filter."""
    # This function is not used by the main list view, so no changes are needed here.
    q = db.query(models.Todo)
    
    if days_ago is not None:
        target_date = datetime.utcnow() - timedelta(days=days_ago)
        q = q.filter(models.Todo.created_at >= target_date)

    query_embedding = get_embedding_for_text(query)
    if not query_embedding:
        return []
    
    results = q.order_by(models.Todo.embedding.cosine_distance(query_embedding)).limit(limit).all()
    return results


def semantic_search_for_api(db: Session, query: str, limit: int = 20) -> List[models.Todo]:
    """
    Performs a semantic search and returns the raw SQLAlchemy model objects.
    This is intended for direct use by API endpoints.
    """
    if not query:
        return []
        
    query_embedding = get_embedding_for_text(query)
    if not query_embedding:
        # If embedding fails (e.g., quota error), return an empty list.
        return []
    
    # We now use cosine_distance as it's often better for normalized embeddings.
    results = db.query(models.Todo).order_by(models.Todo.embedding.cosine_distance(query_embedding)).limit(limit).all()
    return results



def get_stats_in_date_range(db: Session, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> dict:
    """
    Calculates various statistics for to-dos within an optional date range.
    """
    # Base query for all todos
    total_query = db.query(models.Todo)
    
    # Query for items within the date range
    range_query = total_query
    if start_date:
        range_query = range_query.filter(models.Todo.created_at >= start_date)
    if end_date:
        # Add one day to the end_date to include the entire day
        range_query = range_query.filter(models.Todo.created_at < end_date + timedelta(days=1))

    stats = {
        "total_todos": total_query.count(),
        "created_in_range": range_query.count(),
        "completed_in_range": range_query.filter(models.Todo.completed == True).count(),
        "pending_in_range": range_query.filter(models.Todo.completed == False).count(),
        "updated_in_range": range_query.filter(models.Todo.updated_at > models.Todo.created_at).count()
    }
    return stats

def query_database_todos(
    db: Session,
    query: Optional[str] = None,
    completed: Optional[bool] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 200
) -> List[models.Todo]:
    """
    Performs a powerful semantic search with an optional similarity threshold,
    and then applies metadata filters (status, date).
    """
    q = db.query(models.Todo)
    
    # --- STEP 1: SEMANTIC FILTERING (if a query is provided) ---
    if query:
        query_embedding = get_embedding_for_text(query)
        if not query_embedding:
            # If embedding fails, we can't do a semantic search.
            # Depending on desired behavior, we could return empty or just do metadata filtering.
            # Let's proceed with metadata filtering on the whole dataset.
            pass
        else:
            # pgvector's cosine distance is between 0 (identical) and 2 (opposite).
            # A threshold of < 0.5 means "quite similar".
            # You can adjust this value to make the search more strict or more broad.
            SIMILARITY_THRESHOLD = 0.5 
            
            # This is the core of the fix. We filter the results based on their
            # semantic distance to the query.
            q = q.filter(models.Todo.embedding.cosine_distance(query_embedding) < SIMILARITY_THRESHOLD)
            
            # We still order by similarity to get the BEST matches first.
            q = q.order_by(models.Todo.embedding.cosine_distance(query_embedding))

    # --- STEP 2: METADATA FILTERING (applied after semantic filter) ---
    filters = []
    if completed is not None:
        filters.append(models.Todo.completed == completed)
    if start_date:
        filters.append(models.Todo.created_at >= start_date)
    if end_date:
        # Add a day to include the entire end date
        filters.append(models.Todo.created_at < (end_date + timedelta(days=1)))
    
    if filters:
        q = q.filter(and_(*filters))
        
    return q.limit(limit).all()