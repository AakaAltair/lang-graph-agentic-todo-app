import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv
from pathlib import Path

# --- Environment Variable Loading ---
# This part is correct and finds your .env file.
env_path = Path('.') / 'backend' / '.env'
load_dotenv(dotenv_path=env_path)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables. Please check your .env file.")

# --- Database Engine Creation ---
# This creates the main connection interface to your database.
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# --- Enable pgvector Extension ---
# This is the new, critical block.
# It runs a raw SQL command to ensure the 'vector' type is available in PostgreSQL.
# It's wrapped in a 'with' block to ensure the connection is properly handled.
try:
    with engine.connect() as conn:
        print("Enabling the 'vector' extension in the database...")
        conn.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))
        conn.commit()
        print("Extension 'vector' enabled successfully.")
except Exception as e:
    print(f"An error occurred while enabling the vector extension: {e}")
    # Depending on your setup, you might want to exit if this fails,
    # as the rest of the app will not work without the vector type.
    # raise e 

# --- Session and Base Class Setup ---
# SessionLocal is a factory for creating new database sessions (i.e., conversations with the DB).
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is a class that our ORM models (like the Todo model) will inherit from.
Base = declarative_base()

# --- Database Session Dependency ---
# This is a FastAPI dependency that handles the lifecycle of a database session for each API request.
def get_db():
    """
    Creates a new database session for a single API request,
    and ensures it's closed afterward.
    """
    db = SessionLocal()
    try:
        yield db  # Provides the session to the API endpoint
    finally:
        db.close() # Closes the session after the request is finished