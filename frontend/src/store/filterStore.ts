import { create } from 'zustand';

// Define the types for our filters
export type StatusFilter = 'all' | 'active' | 'completed';
export type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';
export type OrderBy = 'created_at' | 'updated_at';
export type OrderDirection = 'desc' | 'asc';

// Define the shape of the store's state and actions
interface FilterState {
  statusFilter: StatusFilter;
  dateFilter: DateFilter;
  orderBy: OrderBy;
  orderDir: OrderDirection;
  
  // --- THIS IS THE KEY CHANGE ---
  // We no longer store the search query string here. Instead, we store the
  // final array of to-do IDs that the agent has identified for spotlighting.
  // A null value means no spotlight is active.
  spotlightIds: number[] | null;
  
  // Actions to update the state
  setStatusFilter: (filter: StatusFilter) => void;
  setDateFilter: (filter: DateFilter) => void;
  setOrderBy: (orderBy: OrderBy) => void;
  setOrderDir: (orderDir: OrderDirection) => void;

  // --- New action to set the spotlighted IDs ---
  setSpotlightIds: (ids: number[] | null) => void;
}

// Create the store
export const useFilterStore = create<FilterState>((set) => ({
  // Initial default state
  statusFilter: 'all',
  dateFilter: 'all',
  orderBy: 'created_at',
  orderDir: 'desc',
  spotlightIds: null, // Initial state is null (no spotlight)

  // Actions to update the state
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setDateFilter: (filter) => set({ dateFilter: filter }),
  setOrderBy: (orderBy) => set({ orderBy: orderBy }),
  setOrderDir: (orderDir) => set({ orderDir: orderDir }),
  
  // Setter function for the new spotlight state
  setSpotlightIds: (ids) => set({ spotlightIds: ids }),
}));