"use client";

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { Todo } from '@/types';
import { deleteTodo } from '@/services/api';
import SpinnerBorder from './SpinnerBorder';

interface TodoItemProps {
  todo: Todo;
  onEdit: (todo: Todo) => void;
  onToggleComplete: (todo: Todo) => void; // It now expects this function as a prop
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onEdit, onToggleComplete }) => {
  const queryClient = useQueryClient();
  
  // The delete mutation can stay here as it's simple and doesn't need optimistic updates.
  const deleteMutation = useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => {
      // It's safer to invalidate all todo queries.
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${todo.title}"?`)) {
      deleteMutation.mutate(todo.id);
    }
  };
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(todo);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <li className="list-none h-full">
      <SpinnerBorder borderRadiusVar="--border-radius-card" className="card h-full">
        <div className="card-text-content p-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-3 flex-grow min-w-0">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  // The onChange now calls the function passed down from the parent page.
                  onChange={() => onToggleComplete(todo)}
                  // You can pass the parent's isPending state as a prop for a disabled effect
                  // disabled={isToggling} 
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
            {todo.updated_at && todo.updated_at !== todo.created_at && ` | Updated: ${formatDate(todo.updated_at)}`}
          </div>
        </div>
      </SpinnerBorder>
    </li>
  );
};

export default TodoItem;