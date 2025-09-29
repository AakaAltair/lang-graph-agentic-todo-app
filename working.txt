"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTodos, createTodo, updateTodo } from '@/services/api';
import { Todo } from '@/types';
import TodoItem from '@/components/TodoItem';
import Modal from '@/components/Modal';
import TodoForm, { TodoFormData } from '@/components/TodoForm';
import { useState, useMemo, useEffect, FC, ReactNode, useCallback } from 'react';
import { useModalStore } from '@/components/WebSocketManager';
import { useFilterStore, OrderBy, OrderDirection } from '@/store/filterStore';
import { XCircle, Search, Calendar } from 'lucide-react';
import SpinnerButton from '@/components/SpinnerButton';
import SpinnerBorder from '@/components/SpinnerBorder';

// No changes needed for this component
const ToggleFilterButton: FC<{ onClick?: () => void, isActive?: boolean, children: ReactNode }> =
  ({ onClick, isActive = false, children }) => {
    return (
      <button onClick={onClick}>
        <SpinnerBorder borderRadiusVar="--border-radius-btn" className={`btn ${isActive ? 'is-active' : ''}`}>
          <div className="spinner-content !px-3 !py-1.5 !text-sm" style={{ borderRadius: 'calc(var(--border-radius-btn) - var(--border-size))' }}>
            {children}
          </div>
        </SpinnerBorder>
      </button>
    );
  };

// No changes needed for this component
const DateInput: FC<{ value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ value, onChange }) => (
  <div className="relative">
    <input type="date" onChange={onChange} value={value} className="form-input !py-1.5 !pr-9" />
    <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
  </div>
);


export default function TodoPage() {
  // --- STATE, QUERIES, DATA, MUTATIONS, and HANDLERS ---
  // (No changes are needed in the component's logic)
  const {
    statusFilter, setStatusFilter, dateFilter, setDateFilter,
    orderBy, setOrderBy, orderDir, setOrderDir,
    spotlight, setSpotlight, startDate, setStartDate, endDate, setEndDate
  } = useFilterStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const queryClient = useQueryClient();
  const todoQueryKey = ['todos', orderBy, orderDir];

  const { data: todos, isLoading, isError } = useQuery<Todo[]>({
    queryKey: todoQueryKey,
    queryFn: () => getTodos({ orderBy, orderDir }),
  });

  const filteredTodos = useMemo(() => {
    if (!todos) return [];
    if (spotlight) { const spotlightSet = new Set(spotlight.ids); return todos.filter(todo => spotlightSet.has(todo.id)); }
    let statusFiltered = todos;
    if (statusFilter === 'active') statusFiltered = todos.filter(todo => !todo.completed);
    else if (statusFilter === 'completed') statusFiltered = todos.filter(todo => todo.completed);
    if (dateFilter === 'all') return statusFiltered;
    const now = new Date(); const today = new Date(new Date(now).setHours(0, 0, 0, 0));
    let startRange: Date | null = null, endRange: Date | null = null;
    switch (dateFilter) {
      case 'today': startRange = today; endRange = new Date(new Date().setHours(23, 59, 59, 999)); break;
      case 'week': startRange = new Date(today); startRange.setDate(today.getDate() - (today.getDay() || 7)); break;
      case 'month': startRange = new Date(today.getFullYear(), today.getMonth(), 1); break;
      case 'custom': startRange = startDate ? new Date(startDate) : null; endRange = endDate ? new Date(endDate) : null; if (endRange) endRange.setHours(23, 59, 59, 999); break;
    }
    return statusFiltered.filter(todo => {
      if (!todo.created_at) return false; const todoDate = new Date(todo.created_at);
      if (startRange && todoDate < startRange) return false; if (endRange && todoDate > endRange) return false;
      return true;
    });
  }, [todos, statusFilter, dateFilter, startDate, endDate, spotlight]);

  useEffect(() => {
    const spinners = document.querySelectorAll('.spinner-border');
    spinners.forEach(spinner => {
      const element = spinner as HTMLElement;
      if (!element.style.getPropertyValue('--spin-duration')) {
        const duration = Math.random() * (5.0 - 2.5) + 2.5;
        const delay = Math.random() * -duration;
        element.style.setProperty('--spin-duration', `${duration.toFixed(2)}s`);
        element.style.setProperty('--spin-delay', `${delay.toFixed(2)}s`);
      }
    });
  }, [filteredTodos]);

  const onFormMutationSuccess = () => { queryClient.invalidateQueries({ queryKey: todoQueryKey }); setIsModalOpen(false); };
  const createMutation = useMutation({ mutationFn: createTodo, onSuccess: onFormMutationSuccess });
  const updateFormMutation = useMutation({ mutationFn: updateTodo, onSuccess: onFormMutationSuccess });

  const toggleCompleteMutation = useMutation({
    mutationFn: (todo: Todo) => updateTodo({ id: todo.id, completed: !todo.completed }),
    onMutate: async (updatedTodo: Todo) => {
      await queryClient.cancelQueries({ queryKey: todoQueryKey });
      const previousTodos = queryClient.getQueryData<Todo[]>(todoQueryKey);
      queryClient.setQueryData<Todo[]>(todoQueryKey, (old) =>
        old ? old.map(todo => todo.id === updatedTodo.id ? { ...todo, completed: !todo.completed } : todo) : []
      );
      return { previousTodos };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousTodos) { queryClient.setQueryData(todoQueryKey, context.previousTodos); }
    },
    onSuccess: (dataFromServer) => {
      queryClient.setQueryData<Todo[]>(todoQueryKey, (old) =>
        old ? old.map(t => t.id === dataFromServer.id ? dataFromServer : t) : []
      );
    },
  });

  const { editingTodoId, setEditingTodoId } = useModalStore();
  const handleOpenCreateModal = () => { setEditingTodo(null); setIsModalOpen(true); };
  const handleOpenEditModal = useCallback((todo: Todo) => { setEditingTodo(todo); setIsModalOpen(true); }, []);

  useEffect(() => {
    if (editingTodoId !== null) {
      const todoToEdit = todos?.find(t => t.id === editingTodoId);
      if (todoToEdit) { handleOpenEditModal(todoToEdit); }
      setEditingTodoId(null);
    }
  }, [editingTodoId, todos, handleOpenEditModal, setEditingTodoId]);

  const handleFormSubmit = (formData: TodoFormData) => {
    if (editingTodo) {
      updateFormMutation.mutate({ id: editingTodo.id, ...formData });
    } else {
      createMutation.mutate({ title: formData.title, description: formData.description });
    }
  };

  const handleToggleComplete = (todo: Todo) => {
    toggleCompleteMutation.mutate(todo);
  };

  // --- RENDER ---
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-5xl font-black text-center mb-8">My Tasks</h1>
      <div className="mb-8">
        <SpinnerButton onClick={handleOpenCreateModal}>
          <div className="spinner-content !px-6 !py-2.5 !text-base" style={{ borderRadius: 'calc(var(--border-radius-btn) - var(--border-size))' }}>
            Add New Task
          </div>
        </SpinnerButton>
      </div>

      <div className="modal-content w-full max-w-6xl mb-8 !p-6 flex flex-col gap-6">
                {spotlight && (
          // The key change is adding `bg-[--card-content-bg]` here.
          // This creates the solid, opaque frame that separates the two effects.
          <div className="spinner-border card is-active bg-[--card-content-bg]">
            <div 
              className="spinner-content flex items-center justify-between gap-4 w-full p-4"
              style={{ borderRadius: 'calc(var(--border-radius-card) - var(--border-size))' }}
            >
              <div className="flex items-center gap-3 text-white/90">
                <Search size={20} className="text-[--theme-accent-primary]" />
                <div className="font-semibold">Semantic Spotlight:<span className="font-normal text-white/80 ml-2">Found {spotlight.count} task(s) related to "{spotlight.query}"</span></div>
              </div>
              <button onClick={() => setSpotlight(null)} className="flex items-center gap-1.5 text-[--theme-accent-primary] hover:text-white transition-colors" title="Clear spotlight">
                <XCircle size={18} /><span>Clear</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-start gap-x-12 gap-y-6">
          <div className="flex items-start gap-4">
            <span className="font-semibold text-white/80 pt-2 shrink-0">Status:</span>
            <div className="flex flex-wrap gap-2">
              <ToggleFilterButton onClick={() => setStatusFilter('all')} isActive={statusFilter === 'all'}>All</ToggleFilterButton>
              <ToggleFilterButton onClick={() => setStatusFilter('active')} isActive={statusFilter === 'active'}>Active</ToggleFilterButton>
              <ToggleFilterButton onClick={() => setStatusFilter('completed')} isActive={statusFilter === 'completed'}>Completed</ToggleFilterButton>
            </div>
          </div>

          {/* CHANGE 2: Restructured the "Date Created" section for better contextual layout */}
          <div className="flex items-start gap-4">
            <span className="font-semibold text-white/80 pt-2 shrink-0">Date Created:</span>
            <div className="flex flex-col items-start w-full gap-2">
              <div className="flex flex-wrap gap-2">
                <ToggleFilterButton onClick={() => setDateFilter('all')} isActive={dateFilter === 'all'}>All Time</ToggleFilterButton>
                <ToggleFilterButton onClick={() => setDateFilter('today')} isActive={dateFilter === 'today'}>Today</ToggleFilterButton>
                <ToggleFilterButton onClick={() => setDateFilter('week')} isActive={dateFilter === 'week'}>This Week</ToggleFilterButton>
                <ToggleFilterButton onClick={() => setDateFilter('month')} isActive={dateFilter === 'month'}>This Month</ToggleFilterButton>
                <ToggleFilterButton onClick={() => setDateFilter('custom')} isActive={dateFilter === 'custom'}>Custom</ToggleFilterButton>
              </div>

              {dateFilter === 'custom' && (
                <div className="flex items-center gap-4 flex-wrap w-full mt-3 pt-3 border-t border-white/10">
                  <label className="font-semibold text-white/80">From:</label>
                  <DateInput value={startDate} onChange={e => setStartDate(e.target.value)} />
                  <label className="font-semibold text-white/80">To:</label>
                  <DateInput value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full h-[1px] bg-white/10"></div>

        <div className="flex flex-wrap items-start gap-x-12 gap-y-6">
          <div className="flex items-start gap-4">
            <span className="font-semibold text-white/80 pt-2 shrink-0">Sort By:</span>
            <div className="flex flex-wrap items-center gap-2">
              <ToggleFilterButton onClick={() => setOrderBy('created_at')} isActive={orderBy === 'created_at'}>Created</ToggleFilterButton>
              <ToggleFilterButton onClick={() => setOrderBy('updated_at')} isActive={orderBy === 'updated_at'}>Updated</ToggleFilterButton>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="font-semibold text-white/80 pt-2 shrink-0">Direction:</span>
            <div className="flex flex-wrap items-center gap-2">
              <ToggleFilterButton onClick={() => setOrderDir('desc')} isActive={orderDir === 'desc'}>Newest</ToggleFilterButton>
              <ToggleFilterButton onClick={() => setOrderDir('asc')} isActive={orderDir === 'asc'}>Oldest</ToggleFilterButton>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl">
        {isLoading && <p className="text-center text-[--text-secondary]">Loading tasks...</p>}
        {isError && <p className="text-center text-red-500">Error loading tasks.</p>}
        {!isLoading && filteredTodos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 todo-grid">
            {filteredTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onEdit={handleOpenEditModal}
                onToggleComplete={handleToggleComplete}
              />
            ))}
          </div>
        )}
        {!isLoading && filteredTodos.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold">No tasks found</h3>
            <p className="text-[--text-secondary]">Try adjusting your filters or create a new task!</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTodo ? 'Edit Task' : 'Create New Task'}>
        <TodoForm onSubmit={handleFormSubmit} initialData={editingTodo} isSubmitting={createMutation.isPending || updateFormMutation.isPending} />
      </Modal>
    </div>
  );
}