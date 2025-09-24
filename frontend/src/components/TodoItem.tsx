"use client";

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';

// --- Corrected Imports for Your Project ---
import { Todo } from '@/types';
import { updateTodo, deleteTodo } from '@/services/api';
import SpinnerBorder from './SpinnerBorder';


// --- The Main Component ---

interface TodoItemProps {
  todo: Todo;
  onEdit: (todo: Todo) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onEdit }) => {
  const queryClient = useQueryClient();

  /**
   * Mutation for updating a todo item.
   * This uses the "Optimistic Update" pattern, which provides an instant UI response
   * and avoids the race condition that causes flickering with `invalidateQueries`.
   */
  const updateMutation = useMutation({
    mutationFn: updateTodo,

    // Step 1: onMutate runs immediately when `mutate` is called.
    onMutate: async (updatedTodo) => {
      // Cancel any outgoing refetches for the 'todos' query to prevent them
      // from overwriting our optimistic update.
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot the previous state of the 'todos' query.
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      // Optimistically update the cache to the new value.
      // This is what makes the UI update instantly.
      queryClient.setQueryData<Todo[]>(['todos'], (oldTodos = []) =>
        oldTodos.map(t => t.id === updatedTodo.id ? { ...t, ...updatedTodo } : t)
      );

      // Return a context object with the snapped-back value.
      return { previousTodos };
    },

    // Step 2: If the mutation fails, use the context returned from onMutate to roll back.
    onError: (err, updatedTodo, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
      console.error("Failed to update todo:", err);
      // Here you could add a user-facing error message (e.g., a toast notification).
    },

    // Step 3: If the mutation succeeds, the server returns the "source of truth".
    // We use this data to precisely update the cache, ensuring consistency without a full refetch.
    onSuccess: (dataFromServer) => {
      queryClient.setQueryData<Todo[]>(['todos'], (oldTodos = []) =>
        oldTodos.map(t => t.id === dataFromServer.id ? dataFromServer : t)
      );
    },
  });

  /**
   * Mutation for deleting a todo item.
   */
  const deleteMutation = useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => {
      // For deletions, a full refetch is often the simplest and most reliable approach.
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
    onError: (err) => {
      console.error("Failed to delete todo:", err);
    }
  });

  // Handler to toggle the completion status of the todo.
  const handleToggleComplete = () => {
    updateMutation.mutate({ id: todo.id, completed: !todo.completed });
  };

  // Handler for the delete button.
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent click handlers from firing.
    if (window.confirm(`Are you sure you want to delete "${todo.title}"?`)) {
      deleteMutation.mutate(todo.id);
    }
  };
  
  // Handler for the edit button.
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent click handlers from firing.
    onEdit(todo);
  };

  // Utility to format date strings for display.
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    // We wrap with `li` for semantic correctness within a `ul` or `ol`,
    // but the `SpinnerBorder` is the visual container.
    <li className="list-none h-full">
      <SpinnerBorder borderRadiusVar="--border-radius-card" className="card h-full">
        <div className="card-text-content p-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-3 flex-grow min-w-0">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={handleToggleComplete}
                  disabled={updateMutation.isPending} // Disable checkbox while the update is in flight
                  className="h-5 w-5 mt-1 rounded border-gray-300 text-[--text-accent] focus:ring-transparent cursor-pointer flex-shrink-0"
                />
                <div className="flex-grow min-w-0">
                  <h2 className={`font-bold text-lg break-words ${todo.completed ? 'line-through text-gray-400' : 'text-white'}`}>
                    {todo.title}
                  </h2>
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                <button onClick={handleEdit} className="text-gray-400 hover:text-yellow-400 transition-colors" aria-label="Edit todo">
                  <Pencil size={18} />
                </button>
                <button onClick={handleDelete} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Delete todo">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            {todo.description && (
              <p className="text-sm text-[--text-secondary] whitespace-pre-wrap break-words pl-8">
                {todo.description}
              </p>
            )}
          </div>
          <div className="text-xs text-gray-500 pl-8 pt-3 mt-3 border-t border-white/10">
            <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded mr-2">ID: {todo.id}</span>
            Created: {formatDate(todo.created_at)}
            {/* A small logic refinement to not show "Updated" if it's the same as Created */}
            {todo.updated_at && todo.updated_at !== todo.created_at && ` | Updated: ${formatDate(todo.updated_at)}`}
          </div>
        </div>
      </SpinnerBorder>
    </li>
  );
};

export default TodoItem;