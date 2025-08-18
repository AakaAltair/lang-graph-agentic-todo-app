import apiClient from '@/lib/axios';
import { Todo } from '@/types';

// Type for the data we send when creating a todo
type TodoCreateData = {
  title: string;
  description?: string;
};

type TodoUpdateData = {
  title?: string;
  description?: string;
  completed?: boolean;
};

export const getTodos = async (): Promise<Todo[]> => {
  const response = await apiClient.get('/todos/');
  return response.data;
};

// NEW FUNCTION
export const createTodo = async (newTodo: TodoCreateData): Promise<Todo> => {
  const response = await apiClient.post('/todos/', newTodo);
  return response.data;
};

export const updateTodo = async ({ id, ...data }: { id: number } & TodoUpdateData): Promise<Todo> => {
  const response = await apiClient.put(`/todos/${id}`, data);
  return response.data;
};

// NEW FUNCTION: Delete a Todo
export const deleteTodo = async (id: number): Promise<Todo> => {
  const response = await apiClient.delete(`/todos/${id}`);
  return response.data;
};

export const sendChatMessage = async (
  message: string, 
  todos_context: string // <-- ADD THIS SECOND ARGUMENT
): Promise<{ reply: string }> => {
  // Pass both message and todos_context in the request body
  const response = await apiClient.post('/chat/', { message, todos_context });
  return response.data;
};