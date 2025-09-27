import apiClient from '@/lib/axios';
import { Todo } from '@/types';

// --- Type Definitions for API Payloads ---

/**
 * The shape of data required when creating a new to-do.
 */
type TodoCreateData = {
  title: string;
  description?: string;
};

/**
 * The shape of data allowed when updating a to-do. All fields are optional.
 */
type TodoUpdateData = {
  title?: string;
  description?: string;
  completed?: boolean;
};

/**
 * The shape of the object defining sorting parameters for fetching all to-dos.
 */
interface GetTodosParams {
  orderBy: 'created_at' | 'updated_at';
  orderDir: 'asc' | 'desc';
}


// --- API Functions ---

/**
 * Fetches the list of all to-dos from the backend, with sorting options.
 * This is used for the main, non-semantic view in the to-do list.
 * @param {GetTodosParams} params - An object containing orderBy and orderDir.
 * @returns {Promise<Todo[]>} A promise that resolves to an array of to-do objects.
 */
export const getTodos = async (params: GetTodosParams): Promise<Todo[]> => {
  // We pass the params object to axios. It will automatically convert this
  // into URL query parameters, e.g., /todos/?order_by=created_at&order_dir=desc
  const response = await apiClient.get('/todos/', {
    params: {
      order_by: params.orderBy,
      order_dir: params.orderDir,
    }
  });
  return response.data;
};

/**
 * Creates a new to-do item via the API.
 * @param {TodoCreateData} newTodo - The data for the new to-do.
 * @returns {Promise<Todo>} The newly created to-do object returned by the server.
 */
export const createTodo = async (newTodo: TodoCreateData): Promise<Todo> => {
  const response = await apiClient.post('/todos/', newTodo);
  return response.data;
};

/**
 * Updates an existing to-do item by its ID.
 * @param {{ id: number } & TodoUpdateData} params - An object containing the to-do's ID and the fields to update.
 * @returns {Promise<Todo>} The fully updated to-do object returned by the server.
 */
export const updateTodo = async ({ id, ...data }: { id: number } & TodoUpdateData): Promise<Todo> => {
  const response = await apiClient.put(`/todos/${id}`, data);
  return response.data;
};

/**
 * Deletes a to-do item by its ID.
 * @param {number} id - The ID of the to-do to delete.
 * @returns {Promise<Todo>} The deleted to-do object returned by the server.
 */
export const deleteTodo = async (id: number): Promise<Todo> => {
  const response = await apiClient.delete(`/todos/${id}`);
  return response.data;
};

/**
 * Performs a semantic search for to-dos based on a natural language query.
 * This is used by the "Semantic Spotlight" feature.
 * @param {string} query - The user's search query (e.g., "school tasks").
 * @returns {Promise<Todo[]>} A promise that resolves to an array of semantically relevant to-do objects.
 */
export const semanticSearchTodos = async (query: string): Promise<Todo[]> => {
  const response = await apiClient.post('/todos/semantic-search', { query });
  return response.data;
};

/**
 * Sends a message to the AI agent and gets a streaming response.
 * @param {string} message - The user's message.
 * @param {string} thread_id - The unique ID for the conversation thread.
 * @returns {Promise<Response>} The raw `fetch` API Response object, which contains the stream.
 */
export const sendChatMessage = async (
  message: string, 
  thread_id: string 
): Promise<Response> => {
  // For streaming, we use the native `fetch` API directly because it has superior
  // support for reading response streams compared to Axios.
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  const response = await fetch(`${apiUrl}/chat/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, thread_id }),
  });
  
  if (!response.ok) {
    // Handle HTTP errors (e.g., 500 Internal Server Error from the backend)
    throw new Error(`Chat API responded with status: ${response.status}`);
  }
  
  return response;
};