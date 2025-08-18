"use client";

import { useState, useEffect } from 'react';
import { Todo } from '@/types';
import SpinnerButton from './SpinnerButton';
import { TodoFormData } from '@/app/todo/page';
import { Calendar, Clock, Hash } from 'lucide-react'; // <-- IMPORT Hash ICON

interface TodoFormProps {
  onSubmit: (data: TodoFormData) => void;
  initialData?: Todo | null;
  isSubmitting: boolean;
}

// Helper component for displaying metadata neatly
const MetadataItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="flex items-center gap-2 text-xs text-gray-500">
    <div className="flex-shrink-0">{icon}</div>
    <span className="font-semibold">{label}:</span>
    <span className="font-mono">{value}</span>
  </div>
);

const TodoForm: React.FC<TodoFormProps> = ({ onSubmit, initialData, isSubmitting }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setCompleted(initialData.completed);
    } else {
      setTitle('');
      setDescription('');
      setCompleted(false);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title, description, completed });
  };
  
  // Helper to format dates, moved inside or can be in a separate utils file
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      
      {/* --- Read-only Metadata Section (only shows in Edit mode) --- */}
      {initialData && (
        <div className="p-3 mb-2 border border-white/10 rounded-md bg-black/20 flex flex-col gap-2">
          <MetadataItem 
            icon={<Hash size={12} />} 
            label="ID" 
            value={String(initialData.id)} 
          />
          <MetadataItem 
            icon={<Calendar size={12} />} 
            label="Created" 
            value={formatDate(initialData.created_at)} 
          />
          {initialData.updated_at && (
             <MetadataItem 
               icon={<Clock size={12} />} 
               label="Updated" 
               value={formatDate(initialData.updated_at)} 
             />
          )}
        </div>
      )}

      {/* --- Editable Form Fields --- */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-[--text-secondary] mb-1">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[--text-accent]"
          required
        />
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-[--text-secondary] mb-1">Description (Optional)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.тarget.value)}
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[--text-accent]"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="completed"
          type="checkbox"
          checked={completed}
          onChange={(e) => setCompleted(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-[--text-accent] focus:ring-[--text-accent]"
        />
        <label htmlFor="completed" className="text-sm font-medium text-[--text-secondary]">
          Mark as completed
        </label>
      </div>
      
      {/* Submit Button */}
      <div className="flex justify-end mt-4">
        <SpinnerButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Create Task')}
        </SpinnerButton>
      </div>
    </form>
  );
}

export default TodoForm;