"use client";

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Todo } from '@/types';
import { updateTodo, deleteTodo } from '@/services/api';
import { Edit, Trash2, Calendar, Clock } from 'lucide-react';

interface TodoItemProps {
  todo: Todo;
  onEdit: (todo: Todo) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onEdit }) => {
  const queryClient = useQueryClient();

  // --- Mutations for quick actions ---
  const onMutationSuccess = () => queryClient.invalidateQueries({ queryKey: ['todos'] });

  const updateMutation = useMutation({ mutationFn: updateTodo, onSuccess: onMutationSuccess });
  const deleteMutation = useMutation({ mutationFn: deleteTodo, onSuccess: onMutationSuccess });

  // --- Event Handlers ---
  const handleToggleComplete = () => {
    updateMutation.mutate({ id: todo.id, completed: !todo.completed });
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "#${todo.id} - ${todo.title}"?`)) {
      deleteMutation.mutate(todo.id);
    }
  };

  // --- Helper to format dates ---
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <li className="p-4 border border-white/10 rounded-lg flex flex-col gap-3 hover:bg-white/5 transition-colors">
      {/* --- Top Row: Checkbox, Title, and Action Buttons --- */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-grow pt-1">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={handleToggleComplete}
            className="h-5 w-5 mt-1 flex-shrink-0 rounded border-gray-300 text-[--text-accent] focus:ring-[--text-accent] cursor-pointer"
            aria-label={`Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`}
          />
          {/* Container for Title and ID */}
          <div className="flex flex-col"> {/* // <-- NEW: Wrapper to stack title and ID */}
            <h2 className={`font-semibold text-lg leading-tight ${todo.completed ? 'line-through text-gray-500' : 'text-white'}`}>
              {todo.title}
            </h2>
            <span className="text-xs font-mono text-cyan-400/60">ID: {todo.id}</span> {/* // <-- NEW: The ID Badge */}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <button
            onClick={() => onEdit(todo)}
            className="text-gray-400 hover:text-yellow-400 transition-colors p-1"
            aria-label="Edit Task"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            aria-label="Delete Task"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* --- Middle Row: Description (only if it exists) --- */}
      {todo.description && (
        // The pl-9 class (padding-left: 2.25rem) aligns this with the title, accounting for the checkbox width and gap
        <div className="pl-9 text-sm text-[--text-secondary]">
          <p>{todo.description}</p>
        </div>
      )}

      {/* --- Bottom Row: Timestamps --- */}
      <div className="pl-9 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
        <div className="flex items-center gap-1.5">
          <Calendar size={12} />
          <span>Created: {formatDate(todo.created_at)}</span>
        </div>
        {todo.updated_at && (
          <div className="flex items-center gap-1.5">
            <Clock size={12} />
            <span>Updated: {formatDate(todo.updated_at)}</span>
          </div>
        )}
      </div>
    </li>
  );
};

export default TodoItem;