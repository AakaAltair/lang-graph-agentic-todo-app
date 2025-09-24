import apiClient from '@/lib/axios';
import { Todo } from '@/types';

// --- Type Definitions for API Payloads ---

// Type for the data we send when creating a todo
type TodoCreateData = {
  title: string;
  description?: string;
};

// Type for the data we send when updating a todo
type TodoUpdateData = {
  title?: string;
  description?: string;
  completed?: boolean;
};

// --- NEW: Type for Sorting Parameters ---
// This defines the shape of the object our getTodos function will accept.
interface GetTodosParams {
  orderBy: 'created_at' | 'updated_at';
  orderDir: 'asc' | 'desc';
}


// --- API Functions ---

/**
 * Fetches the list of to-dos from the backend.
 * Now accepts sorting parameters.
 * @param {GetTodosParams} params - An object containing orderBy and orderDir.
 * @returns {Promise<Todo[]>} A promise that resolves to an array of to-dos.
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
 * Creates a new to-do item.
 * @param {TodoCreateData} newTodo - The data for the new to-do.
 * @returns {Promise<Todo>} The newly created to-do object from the server.
 */
export const createTodo = async (newTodo: TodoCreateData): Promise<Todo> => {
  const response = await apiClient.post('/todos/', newTodo);
  return response.data;
};

/**
 * Updates an existing to-do item.
 * @param {{ id: number } & TodoUpdateData} params - An object containing the ID and the data to update.
 * @returns {Promise<Todo>} The fully updated to-do object from the server.
 */
export const updateTodo = async ({ id, ...data }: { id: number } & TodoUpdateData): Promise<Todo> => {
  const response = await apiClient.put(`/todos/${id}`, data);
  return response.data;
};

/**
 * Deletes a to-do item by its ID.
 * @param {number} id - The ID of the to-do to delete.
 * @returns {Promise<Todo>} The deleted to-do object from the server.
 */
export const deleteTodo = async (id: number): Promise<Todo> => {
  const response = await apiClient.delete(`/todos/${id}`);
  return response.data;
};

/**
 * Sends a message to the AI agent.
 * @param {string} message - The user's message.
 * @param {string} thread_id - The unique ID for the conversation thread.
 * @returns {Promise<Response>} The raw streaming response from the server.
 */
export const sendChatMessage = async (
  message: string, 
  thread_id: string 
): Promise<Response> => {
  // For streaming, we use the native `fetch` API directly, as it handles streams better.
  // We construct the full URL from our environment variable.
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  const response = await fetch(`${apiUrl}/chat/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, thread_id }),
  });
  
  return response;
};