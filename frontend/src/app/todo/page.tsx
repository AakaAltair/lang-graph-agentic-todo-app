"use client";

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTodos, createTodo, updateTodo } from '@/services/api';
import { Todo } from '@/types';
import SpinnerBorder from '@/components/SpinnerBorder';
import SpinnerButton from '@/components/SpinnerButton';
import TodoItem from '@/components/TodoItem';
import Modal from '@/components/Modal';
import TodoForm from '@/components/TodoForm';
// --- NEW: Import the global modal store ---
import { useModalStore } from '@/components/WebSocketManager';

// Define the possible filter types
type FilterType = 'all' | 'active' | 'completed';

// This type is now needed by TodoForm, so it's good to keep it exported or defined in a shared types file.
export type TodoFormData = {
  title: string;
  description: string; // Changed to non-optional for the form
};

export default function TodoPage() {
  // --- STATE MANAGEMENT ---
  const [filter, setFilter] = useState<FilterType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  // --- GLOBAL STATE HOOKS (for AI interaction) ---
  const { editingTodoId, setEditingTodoId } = useModalStore();

  const queryClient = useQueryClient();

  // --- DATA FETCHING ---
  const { data: todos, isLoading, isError } = useQuery<Todo[]>({
    queryKey: ['todos'],
    queryFn: getTodos,
  });

  // --- NEW: Effect to react to global state changes from the WebSocket ---
  // This `useEffect` acts as a listener. When the WebSocketManager updates the global
  // `editingTodoId`, this effect will run and open the correct modal.
  useEffect(() => {
    if (editingTodoId !== null && todos) {
      const todoToEdit = todos.find(t => t.id === editingTodoId);
      if (todoToEdit) {
        // We found the todo the AI wants to edit, so we open the modal.
        handleOpenEditModal(todoToEdit);
      }
      // IMPORTANT: Reset the global state after we've handled the request.
      // This prevents the modal from re-opening on every re-render.
      setEditingTodoId(null);
    }
  }, [editingTodoId, todos, setEditingTodoId]); // Dependencies ensure this runs at the right times


  // --- DATA MUTATIONS (No changes here) ---
  const onMutationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
    setIsModalOpen(false);
    setEditingTodo(null);
  };

  const createMutation = useMutation({
    mutationFn: createTodo,
    onSuccess: onMutationSuccess,
  });

  const updateMutation = useMutation({
    mutationFn: updateTodo,
    onSuccess: onMutationSuccess,
  });

  // --- EVENT HANDLERS (No changes here) ---
  const handleOpenCreateModal = () => {
    setEditingTodo(null);
    setIsModalOpen(true);
  };
  
  const handleOpenEditModal = (todo: Todo) => {
    setEditingTodo(todo);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (formData: TodoFormData) => {
    if (editingTodo) {
      // Pass `completed` status along so it isn't reset on update
      updateMutation.mutate({ id: editingTodo.id, ...formData, completed: editingTodo.completed });
    } else {
      // New todos are not completed by default
      createMutation.mutate({ ...formData, completed: false });
    }
  };

  // --- FILTERING LOGIC (No changes here) ---
  const filteredTodos = useMemo(() => {
    if (!todos) return [];
    switch (filter) {
      case 'active':
        return todos.filter(todo => !todo.completed);
      case 'completed':
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  }, [todos, filter]);


  // --- SUB-COMPONENTS & RENDER (No changes here) ---
  const FilterButton = ({ type, label }: { type: FilterType, label: string }) => (
    <button
      onClick={() => setFilter(type)}
      className={`px-4 py-2 rounded-full font-semibold transition-colors ${
        filter === type
          ? 'bg-[--text-accent] text-white'
          : 'bg-white/10 hover:bg-white/20 text-[--text-secondary]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-5xl font-black text-center mb-8">My Tasks</h1>

      <div className="mb-8">
        <SpinnerButton onClick={handleOpenCreateModal}>
          Add New Task
        </SpinnerButton>
      </div>
      
      <SpinnerBorder 
        className="card w-full max-w-2xl" 
        borderRadiusVar="--border-radius-card"
      >
        <div className="card-text-content">
          <div className="flex items-center justify-center gap-4 my-6">
            <FilterButton type="all" label="All" />
            <FilterButton type="active" label="Active" />
            <FilterButton type="completed" label="Completed" />
          </div>

          <ul className="space-y-4">
            {isLoading && <p className="text-center text-[--text-secondary]">Loading tasks...</p>}
            {isError && <p className="text-center text-red-500">Error loading tasks.</p>}
            {!isLoading && !isError && filteredTodos.length === 0 && (
              <p className="text-center text-[--text-secondary]">
                No tasks match the current filter.
              </p>
            )}
            {filteredTodos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} onEdit={handleOpenEditModal} />
            ))}
          </ul>
        </div>
      </SpinnerBorder>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingTodo ? 'Edit Task' : 'Create New Task'}
      >
        <TodoForm 
          onSubmit={handleFormSubmit}
          initialData={editingTodo}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  );
}