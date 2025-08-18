import { create } from 'zustand';

// Define the shape of a single chat message
export interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

// Define the shape of the store's state and actions
interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  toggleChat: () => void;
  addMessage: (message: ChatMessage) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  // --- INITIAL STATE ---
  isOpen: false, // The chat window is closed by default
  messages: [
    // A welcome message from the AI to start the conversation
    { id: 1, text: "Hello! I'm your AI assistant. How can I help you manage your tasks today?", sender: 'ai' }
  ],

  // --- ACTIONS ---
  // Toggles the open/closed state of the chat window
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  
  // Adds a new message to the messages array
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
}));