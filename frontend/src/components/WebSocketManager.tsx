"use client";

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useThemeStore } from '@/store/themeStore';
import { create } from 'zustand';

// --- NEW: Import the global filter store ---
import { useFilterStore } from '@/store/filterStore';

// --- Global Zustand store for Modal Control ---
// This allows any component (like our WebSocketManager) to request that the modal be opened.
// The TodoPage component will listen to this store and react accordingly.
interface ModalState {
  editingTodoId: number | null;
  setEditingTodoId: (id: number | null) => void;
}
export const useModalStore = create<ModalState>((set) => ({
  editingTodoId: null,
  setEditingTodoId: (id) => set({ editingTodoId: id }),
}));

// --- The WebSocket Manager Component ---
const WebSocketManager = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { setTheme } = useThemeStore();
  const { setEditingTodoId } = useModalStore();
  
  // --- NEW: Get the setter functions from the filter store ---
  const { setStatusFilter, setDateFilter, setOrderBy, setOrderDir } = useFilterStore();

  useEffect(() => {
    // This effect runs once when the component mounts to establish the connection.
    const wsUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, 'ws') + '/ws';
    if (!wsUrl) {
        console.error("WebSocket URL is not defined. Check your NEXT_PUBLIC_API_URL environment variable.");
        return;
    }
    
    console.log(`Attempting to connect to WebSocket at ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    // --- WebSocket Event Handlers ---

    ws.onopen = () => {
      console.log('✅ WebSocket connection established.');
    };

    ws.onmessage = (event) => {
      console.log("RAW WEBSOCKET MESSAGE RECEIVED:", event.data);
      
      try {
        const message = JSON.parse(event.data);
        console.log('PARSED WEBSOCKET COMMAND:', message);

        // --- Command Router ---
        // This is where we interpret the commands from the backend agent.

        if (message.type === 'data_update' && message.payload === 'todos_updated') {
            console.log("EXECUTING data update: Invalidating 'todos' query.");
            queryClient.invalidateQueries({ queryKey: ['todos'] });
        } else if (message.type === 'ui_action') {
            switch (message.action) {
                case 'navigate':
                    console.log(`EXECUTING navigation to: ${message.payload}`);
                    router.push(message.payload);
                    break;
                case 'set_theme':
                    console.log(`EXECUTING theme change to: ${message.payload}`);
                    setTheme(message.payload);
                    break;
                case 'open_edit_modal':
                    console.log(`EXECUTING open edit modal for todo ID: ${message.payload}`);
                    const todoId = parseInt(message.payload, 10);
                    if (!isNaN(todoId)) {
                        setEditingTodoId(todoId);
                    }
                    break;
                
                // --- NEW CASES TO HANDLE FILTER COMMANDS ---
                case 'set_status_filter':
                    console.log(`EXECUTING status filter change to: ${message.payload}`);
                    setStatusFilter(message.payload);
                    break;
                case 'set_date_filter':
                    console.log(`EXECUTING date filter change to: ${message.payload}`);
                    setDateFilter(message.payload);
                    break;
                case 'set_order_by':
                    console.log(`EXECUTING order_by change to: ${message.payload}`);
                    setOrderBy(message.payload);
                    break;
                case 'set_order_dir':
                    console.log(`EXECUTING order_dir change to: ${message.payload}`);
                    setOrderDir(message.payload);
                    break;
                
                default:
                    console.warn('Unknown UI action received:', message.action);
            }
        }
      } catch (e) {
        console.error('Failed to parse incoming WebSocket message:', e);
      }
    };

    ws.onclose = (event) => {
      console.log('❌ WebSocket connection closed.', event.reason);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // --- Cleanup Function ---
    return () => {
      console.log('Closing WebSocket connection...');
      ws.close();
    };

    // --- NEW: Add the new filter setters to the dependency array ---
    // This ensures the useEffect hook has access to the latest versions of these functions.
  }, [
    queryClient, 
    router, 
    setTheme, 
    setEditingTodoId,
    setStatusFilter,
    setDateFilter,
    setOrderBy,
    setOrderDir
  ]);

  return null;
};

export default WebSocketManager;