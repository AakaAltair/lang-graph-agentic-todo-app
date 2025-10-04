"use client";

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { create } from 'zustand';

// --- Import Global Stores ---
import { useThemeStore } from '@/store/themeStore';
import { useFilterStore, SpotlightInfo } from '@/store/filterStore';

// --- Global Zustand store for Modal Control ---
// This allows any component (like our WebSocketManager) to request that the modal be opened.
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
  
  // --- Get all setter functions from the filter store ---
  const { 
    setStatusFilter, 
    setDateFilter, 
    setOrderBy, 
    setOrderDir,
    setSpotlight,
    setStartDate,
    setEndDate
  } = useFilterStore();

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
                
                // Cases for standard filter commands
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
                
                // Case for the rich spotlight object
                case 'spotlight_todos_by_id':
                    console.log(`EXECUTING spotlight with payload:`, message.payload);
                    
                    // The payload from the agent for this action is already a JSON object string.
                    const spotlightInfo: SpotlightInfo = JSON.parse(message.payload);
                    
                    if (spotlightInfo && Array.isArray(spotlightInfo.ids)) {
                      if (spotlightInfo.ids.length > 0) {
                        setSpotlight(spotlightInfo);
                        // ** REFINEMENT **: When a spotlight is activated, reset manual
                        // filters to prevent conflicts and ensure results are visible.
                        console.log("Resetting manual filters for new spotlight view.");
                        setStatusFilter('all');
                        setDateFilter('all');
                      } else {
                        // If the payload has an empty 'ids' list, clear the spotlight.
                        setSpotlight(null);
                      }
                    } else {
                      console.error("Invalid spotlight payload received:", message.payload);
                      setSpotlight(null);
                    }
                    break;

                // --- THIS IS THE UPDATED CASE ---
                case 'set_custom_date_range':
                    console.log(`EXECUTING custom date range with payload:`, message.payload);
                    
                    try {
                        // The payload is a JSON string of an object, so we parse it.
                        const { startDate, endDate } = JSON.parse(message.payload);
                        
                        // Update the state store with the dates received from the agent.
                        if (startDate) setStartDate(startDate);
                        if (endDate) setEndDate(endDate);
                        
                        // Automatically switch the active filter to 'custom' to show the date inputs on the UI.
                        setDateFilter('custom');

                    } catch (e) {
                         console.error("Failed to parse custom date range payload:", e, "Payload was:", message.payload);
                    }
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

  }, [
    queryClient, 
    router, 
    setTheme, 
    setEditingTodoId,
    setStatusFilter,
    setDateFilter,
    setOrderBy,
    setOrderDir,
    setSpotlight,
    setStartDate,
    setEndDate
  ]);

  return null; // This component renders nothing visible.
};

export default WebSocketManager;