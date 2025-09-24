"use client";

import React from 'react';
import { Todo } from '@/types';
import SpinnerButton from './SpinnerButton';

// The type definition for the data this form submits.
// It's exported so the parent page (TodoPage) can use it for type safety.
export type TodoFormData = {
  title: string;
  description: string;
  completed: boolean;
};

// The props the component accepts.
interface TodoFormProps {
  onSubmit: (data: TodoFormData) => void;
  initialData?: Todo | null; // Optional data for pre-filling the form in "edit" mode
  isSubmitting: boolean;      // Prop to know if the parent is processing a submission
}

const TodoForm: React.FC<TodoFormProps> = ({ onSubmit, initialData, isSubmitting }) => {
  // Helper function to format date strings into a more readable local format.
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };
  
  // The function that handles the form's submission event.
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent the default browser page reload on form submission

    // Use the FormData API to reliably read all fields from the form.
    // This is more robust than using controlled components with useState for every field.
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    // An HTML checkbox sends the value 'on' when checked, and nothing when unchecked.
    const completed = formData.get('completed') === 'on';

    // Basic validation to prevent submitting an empty title.
    if (!title.trim()) return;

    // Call the onSubmit function passed down from the parent component (TodoPage)
    // with the collected form data.
    onSubmit({ title, description, completed });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* --- METADATA SECTION --- */}
      {/* This block is only rendered if `initialData` is provided (i.e., in "edit" mode). */}
      {initialData && (
        <div className="text-xs text-gray-400 bg-white/5 p-3 rounded-md flex flex-col gap-1">
          {/* Row 1: ID */}
          <div className="flex justify-between items-center">
            <span className="font-semibold">ID:</span>
            <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded">{initialData.id}</span>
          </div>
          {/* Row 2: Created Date */}
          <div className="flex justify-between items-center">
            <span className="font-semibold">Created:</span>
            <span>{formatDate(initialData.created_at)}</span>
          </div>
          {/* Row 3: Updated Date (only shown if it exists) */}
          {initialData.updated_at && (
            <div className="flex justify-between items-center">
              <span className="font-semibold">Last Updated:</span>
              <span>{formatDate(initialData.updated_at)}</span>
            </div>
          )}
        </div>
      )}

      {/* --- FORM FIELDS --- */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-[--text-secondary] mb-1">Title</label>
        <input
          id="title"
          name="title" // The 'name' attribute is crucial for FormData
          type="text"
          defaultValue={initialData?.title || ''} // Pre-fills the title in edit mode
          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[--text-accent]"
          required
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-[--text-secondary] mb-1">Description (Optional)</label>
        <textarea
          id="description"
          name="description" // The 'name' attribute is crucial for FormData
          defaultValue={initialData?.description || ''} // Pre-fills the description in edit mode
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[--text-accent]"
        />
      </div>
      
      {/* --- COMPLETED STATUS CHECKBOX --- */}
      <div className="flex items-center gap-2">
        <input
          id="completed"
          name="completed" // The 'name' attribute is crucial for FormData
          type="checkbox"
          defaultChecked={initialData?.completed || false} // Pre-checks the box in edit mode if the task is completed
          className="h-4 w-4 rounded border-gray-300 text-[--text-accent] focus:ring-transparent"
        />
        <label htmlFor="completed" className="text-sm font-medium text-[--text-secondary] cursor-pointer">
          Mark as Completed
        </label>
      </div>

      {/* --- SUBMIT BUTTON --- */}
      <div className="flex justify-end pt-4">
        <SpinnerButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Create Task')}
        </SpinnerButton>
      </div>
    </form>
  );
}

export default TodoForm;