import { create } from 'zustand';

// --- Type Definitions ---

// Filter types for status, date presets, and ordering
export type StatusFilter = 'all' | 'active' | 'completed';
export type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';
export type OrderBy = 'created_at' | 'updated_at';
export type OrderDirection = 'desc' | 'asc';

// The shape of the spotlight object for semantic search results
export interface SpotlightInfo {
  ids: number[];
  query: string;
  count: number;
}

// --- NEW: Type for the custom date range payload ---
export interface CustomDateRange {
  startDate: string;
  endDate: string;
}

// --- Updated Store State Definition ---
// The main interface for our Zustand store.
interface FilterState {
  // Filter states
  statusFilter: StatusFilter;
  dateFilter: DateFilter;
  orderBy: OrderBy;
  orderDir: OrderDirection;
  spotlight: SpotlightInfo | null;
  startDate: string; // Will hold 'YYYY-MM-DD'
  endDate: string;   // Will hold 'YYYY-MM-DD'
  
  // Actions to update the state
  setStatusFilter: (filter: StatusFilter) => void;
  setDateFilter: (filter: DateFilter) => void;
  setOrderBy: (orderBy: OrderBy) => void;
  setOrderDir: (orderDir: OrderDirection) => void;
  setSpotlight: (spotlightInfo: SpotlightInfo | null) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;

  // --- NEW: A consolidated action for the agent ---
  setCustomDateRange: (range: CustomDateRange) => void;
}

// --- Create the Zustand Store ---
export const useFilterStore = create<FilterState>((set) => ({
  // --- Initial default state for all filters ---
  statusFilter: 'all',
  dateFilter: 'all',
  orderBy: 'created_at',
  orderDir: 'desc',
  spotlight: null,
  startDate: '',
  endDate: '',

  // --- Setter Functions (Actions) ---
  // These are the functions our components and WebSocket manager will call.
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setDateFilter: (filter) => set({ dateFilter: filter }),
  setOrderBy: (orderBy) => set({ orderBy: orderBy }),
  setOrderDir: (orderDir) => set({ orderDir: orderDir }),
  setSpotlight: (spotlightInfo) => set({ spotlight: spotlightInfo }),
  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),

  // --- NEW: The consolidated setter for custom date ranges ---
  // This action updates three state variables at once, which is exactly
  // what we need when the agent sends a custom date range command.
  setCustomDateRange: (range) => set({
    dateFilter: 'custom',   // Activate the 'custom' filter view
    startDate: range.startDate, // Set the start date
    endDate: range.endDate,     // Set the end date
  }),
}));