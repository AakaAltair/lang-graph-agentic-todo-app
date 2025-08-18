import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define the shape of the store's state and actions
interface ThemeState {
  theme: string;
  setTheme: (theme: string) => void;
}

// Create the store
export const useThemeStore = create<ThemeState>()(
  // The `persist` middleware automatically saves the state
  persist(
    (set) => ({
      // ✅ FIX: Changed default theme to a valid, defined theme from your CSS.
      theme: 'theme-mono', 
      
      // Action to update the state
      setTheme: (newTheme) => set({ theme: newTheme }),
    }),
    {
      // Configuration for persistence
      name: 'agentic-todo-theme-storage', // name of the item in storage (must be unique)
    }
  )
);