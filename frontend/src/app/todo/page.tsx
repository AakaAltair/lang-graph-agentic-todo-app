"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { XCircle } from 'lucide-react';

// --- Local Component Imports ---
import { getTodos, createTodo, updateTodo } from '@/services/api'; 
import { Todo } from '@/types';
import SpinnerButton from '@/components/SpinnerButton';
import TodoItem from '@/components/TodoItem';
import Modal from '@/components/Modal';
import TodoForm, { TodoFormData } from '@/components/TodoForm';
import { useModalStore } from '@/components/WebSocketManager';
import { useFilterStore } from '@/store/filterStore';
import type { OrderBy, OrderDirection } from '@/store/filterStore';

// --- Helper Components ---
const FilterButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
}> = ({ onClick, isActive, children }) => {
  // This custom button component is well-designed. No changes needed.
  if (isActive) {
    return (
      <div className="p-[3px]">
        <SpinnerButton onClick={onClick} className="!py-[4.5px] !px-4 !text-sm">
          {children}
        </SpinnerButton>
      </div>
    );
  }
  return (
    <div className="p-[3px]">
      <button
        onClick={onClick}
        className="px-4 py-1.5 rounded-full font-semibold transition-colors text-sm bg-white/10 hover:bg-white/20 text-[--text-secondary]"
      >
        {children}
      </button>
    </div>
  );
};


// --- Main Page Component ---

export default function TodoPage() {
  // --- STATE MANAGEMENT (Global and Local) ---
  const {
    statusFilter, setStatusFilter,
    dateFilter, setDateFilter,
    orderBy, setOrderBy,
    orderDir, setOrderDir,
    spotlightIds, setSpotlightIds // <-- Switched from semanticQuery to spotlightIds
  } = useFilterStore();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  
  const queryClient = useQueryClient();

  // --- DATA FETCHING (SIMPLIFIED) ---
  // We now only need ONE query. It fetches ALL the data, sorted as requested.
  // The filtering, including the new spotlight, is done on the client side.
  const { data: allTodos, isLoading, isError } = useQuery<Todo[]>({
    queryKey: ['todos', orderBy, orderDir],
    queryFn: () => getTodos({ orderBy, orderDir }),
    // This query always runs, ensuring we have the full dataset available for filtering.
  });

  // --- DATA FILTERING (Client-side, now includes Spotlight) ---
  const filteredTodos = useMemo(() => {
    if (!allTodos) return [];
    
    // **CRITICAL CHANGE**: If a spotlight is active, it takes absolute precedence.
    if (spotlightIds) {
      const spotlightSet = new Set(spotlightIds);
      return allTodos.filter(todo => spotlightSet.has(todo.id));
    }

    // If no spotlight is active, proceed with the normal manual filters.
    let statusFiltered = allTodos;
    if (statusFilter === 'active') {
      statusFiltered = allTodos.filter(todo => !todo.completed);
    } else if (statusFilter === 'completed') {
      statusFiltered = allTodos.filter(todo => todo.completed);
    }
    
    if (dateFilter === 'all') return statusFiltered;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startRange: Date | null = null;
    let endRange: Date | null = null;

    switch (dateFilter) {
      case 'today':
        startRange = today;
        endRange = new Date(today);
        endRange.setDate(today.getDate() + 1);
        break;
      case 'week':
        startRange = new Date(today);
        startRange.setDate(today.getDate() - today.getDay());
        break;
      case 'month':
        startRange = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'custom':
        startRange = startDate ? new Date(new Date(startDate).getTime() + (new Date(startDate).getTimezoneOffset() * 60000)) : null;
        endRange = endDate ? new Date(new Date(endDate).getTime() + (new Date(endDate).getTimezoneOffset() * 60000) + 86400000) : null;
        break;
    }

    return statusFiltered.filter(todo => {
      const todoDate = new Date(todo.created_at);
      if (startRange && todoDate < startRange) return false;
      if (endRange && todoDate >= endRange) return false;
      return true;
    });
  }, [allTodos, spotlightIds, statusFilter, dateFilter, startDate, endDate]);


  // --- DATA MUTATIONS & MODAL LOGIC (No changes needed here) ---
  const onMutationSuccess = () => { queryClient.invalidateQueries({ queryKey: ['todos'] }); setIsModalOpen(false); };
  const createMutation = useMutation({ mutationFn: createTodo, onSuccess: onMutationSuccess });
  const updateMutation = useMutation({ mutationFn: updateTodo, onSuccess: onMutationSuccess });
  
  const { editingTodoId, setEditingTodoId } = useModalStore();
  const handleOpenCreateModal = () => { setEditingTodo(null); setIsModalOpen(true); };
  const handleOpenEditModal = useCallback((todo: Todo) => { setEditingTodo(todo); setIsModalOpen(true); }, []);

  useEffect(() => {
    if (editingTodoId !== null) {
      const todoToEdit = allTodos?.find(t => t.id === editingTodoId);
      if (todoToEdit) {
        handleOpenEditModal(todoToEdit);
      }
      setEditingTodoId(null);
    }
  }, [editingTodoId, allTodos, setEditingTodoId, handleOpenEditModal]);
  
  const handleFormSubmit = (formData: TodoFormData) => {
    if (editingTodo) {
      updateMutation.mutate({ id: editingTodo.id, ...formData });
    } else {
      createMutation.mutate({ title: formData.title, description: formData.description });
    }
  };


  // --- ANIMATION SYNC LOGIC (No changes needed here) ---
  useEffect(() => {
    const spinners = document.querySelectorAll('.todo-grid .spinner-border, .filter-controls .spinner-border');
    spinners.forEach((spinner) => {
      const element = spinner as HTMLElement;
      const duration = Math.random() * (5.0 - 2.5) + 2.5;
      const delay = -(Math.random() * duration);
      element.style.setProperty('--spin-duration', `${duration.toFixed(2)}s`);
      element.style.setProperty('--spin-delay', `${delay.toFixed(2)}s`);
    });
  }, [filteredTodos, statusFilter, dateFilter, orderBy, orderDir]);


  // --- RENDER ---
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-5xl font-black text-center mb-8">My Tasks</h1>
      <div className="mb-8">
        <SpinnerButton onClick={handleOpenCreateModal}>Add New Task</SpinnerButton>
      </div>
      
      <div className="w-full max-w-6xl mb-8 p-4 bg-black/20 rounded-lg flex flex-col gap-4 filter-controls">
        {/* The Spotlight Banner now uses the `spotlightIds` state */}
        {spotlightIds && (
          <div className="flex items-center justify-center gap-2 p-3 bg-yellow-500/10 rounded-lg text-yellow-300 border border-yellow-500/20">
            <span className="font-semibold text-sm">Semantic Spotlight Active</span>
            <button 
              onClick={() => setSpotlightIds(null)} 
              className="ml-auto hover:text-white transition-colors flex items-center gap-1"
              aria-label="Clear semantic filter"
            >
              <XCircle size={20} />
              Clear
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold mr-2 text-white/80">Status:</span>
            <FilterButton onClick={() => setStatusFilter('all')} isActive={statusFilter === 'all'}>All</FilterButton>
            <FilterButton onClick={() => setStatusFilter('active')} isActive={statusFilter === 'active'}>Active</FilterButton>
            <FilterButton onClick={() => setStatusFilter('completed')} isActive={statusFilter === 'completed'}>Completed</FilterButton>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold mr-2 text-white/80">Date Created:</span>
            <FilterButton onClick={() => setDateFilter('all')} isActive={dateFilter === 'all'}>All Time</FilterButton>
            <FilterButton onClick={() => setDateFilter('today')} isActive={dateFilter === 'today'}>Today</FilterButton>
            <FilterButton onClick={() => setDateFilter('week')} isActive={dateFilter === 'week'}>This Week</FilterButton>
            <FilterButton onClick={() => setDateFilter('month')} isActive={dateFilter === 'month'}>This Month</FilterButton>
            <FilterButton onClick={() => setDateFilter('custom')} isActive={dateFilter === 'custom'}>Custom</FilterButton>
          </div>
        </div>
        
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-4 pt-4 mt-4 border-t border-white/10">
            <label className="font-semibold text-white/80">From:</label>
            <input type="date" onChange={e => setStartDate(e.target.value)} value={startDate} className="bg-white/10 rounded-md p-1.5 text-white/80"/>
            <label className="font-semibold text-white/80">To:</label>
            <input type="date" onChange={e => setEndDate(e.target.value)} value={endDate} className="bg-white/10 rounded-md p-1.5 text-white/80"/>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center gap-x-8 gap-y-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold mr-2 text-white/80">Sort By:</span>
            <FilterButton onClick={() => setOrderBy('created_at')} isActive={orderBy === 'created_at'}>Created Date</FilterButton>
            <FilterButton onClick={() => setOrderBy('updated_at')} isActive={orderBy === 'updated_at'}>Updated Date</FilterButton>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold mr-2 text-white/80">Direction:</span>
            <FilterButton onClick={() => setOrderDir('desc')} isActive={orderDir === 'desc'}>Newest First</FilterButton>
            <FilterButton onClick={() => setOrderDir('asc')} isActive={orderDir === 'asc'}>Oldest First</FilterButton>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl">
        {isLoading && <p className="text-center text-[--text-secondary]">Loading tasks...</p>}
        {isError && <p className="text-center text-red-500">Error loading tasks.</p>}
        
        {!isLoading && filteredTodos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 todo-grid">
            {filteredTodos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} onEdit={handleOpenEditModal} />
            ))}
          </div>
        )}
        
        {!isLoading && filteredTodos.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold">
              {spotlightIds ? "No tasks match the agent's search" : "No tasks found"}
            </h3>
            <p className="text-[--text-secondary]">
              {spotlightIds ? "Try a different search query in the chat." : "Try adjusting your filters or create a new task!"}
            </p>
          </div>
        )}
      </div>

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