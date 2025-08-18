"use client";

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTodo } from '@/services/api';
import SpinnerButton from './SpinnerButton';

const AddTodoForm = () => {
  const [title, setTitle] = useState('');
  const queryClient = useQueryClient();

  // useMutation is for actions that change data (Create, Update, Delete)
  const mutation = useMutation({
    mutationFn: createTodo, // The function to call when submitting
    onSuccess: () => {
      // This is the key to automatic updates!
      // It tells React Query that the 'todos' data is now stale
      // and needs to be refetched.
      console.log('Todo created successfully! Invalidating query...');
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setTitle(''); // Clear the input field on success
    },
    onError: (error) => {
      console.error("Error creating todo:", error);
      // Here you could show an error message to the user
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return; // Don't submit if input is empty

    // Call the mutation with the new todo's data
    mutation.mutate({ title });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-4 mb-8">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        disabled={mutation.isPending} // Disable input while submitting
        className="flex-grow bg-white/5 border border-white/10 rounded-full px-4 py-2 text-[--text-primary] placeholder:text-[--text-secondary]/50 focus:outline-none focus:ring-2 focus:ring-[--text-accent]"
      />
      <SpinnerButton type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Adding...' : 'Add Task'}
      </SpinnerButton>
    </form>
  );
};

export default AddTodoForm;