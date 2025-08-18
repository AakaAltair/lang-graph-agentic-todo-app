# LangGraph Agentic To-Do App

This is a full-stack, agentic To-Do application built with a modern technology stack. The frontend is a Next.js application, the backend is powered by FastAPI, and it uses a PostgreSQL database with the `pgvector` extension for vector similarity search, all orchestrated with Docker.

## Tech Stack

- **Frontend:** [Next.js](https://nextjs.org/), [React](https://reactjs.org/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend:** [FastAPI](https://fastapi.tiangolo.com/), Python
- **Database:** [PostgreSQL](https://www.postgresql.org/) with [pgvector](https://github.com/pgvector/pgvector)
- **Containerization:** [Docker](https://www.docker.com/)

## Features

-   Create, read, update, and delete tasks.
-   Agentic backend that can process tasks intelligently.
-   Vector-based task similarity (example feature).
-   ... (add your other features)

## Project Structure

```
/
├── backend/      # FastAPI application
├── frontend/     # Next.js application
├── project.txt   # Project description/notes
└── README.md
```

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (v18 or later)
-   [Python](https://www.python.org/) (v3.10 or later)
-   [Docker](https://www.docker.com/products/docker-desktop/) and Docker Compose

### Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/lang-graph-agentic-todo-app.git
    cd lang-graph-agentic-todo-app
    ```

2.  **Set up the Database:**
    The PostgreSQL database with the `pgvector` extension runs in a Docker container.
    ```bash
    # (Optional: If you have a docker-compose.yml, add instructions here)
    # For now, explain how to run it manually or with a Docker command.
    echo "Make sure Docker Desktop is running."
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the `backend` directory. You can copy the example:
    ```bash
    # In the backend/ directory
    cp .env.example .env
    ```
    Then, fill in the `.env` file with your database credentials.

4.  **Install Backend Dependencies:**
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

5.  **Install Frontend Dependencies:**
    ```bash
    cd ../frontend
    npm install
    ```

### Running the Application

1.  **Start the database container** (if you have one).
2.  **Run the FastAPI backend:**
    ```bash
    cd backend
    uvicorn main:app --reload
    ```
3.  **Run the Next.js frontend:**
    ```bash
    cd frontend
    npm run dev
    ```

The application will be available at `http://localhost:3000`.