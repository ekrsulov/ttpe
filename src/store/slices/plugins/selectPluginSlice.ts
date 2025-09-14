import type { StateCreator } from 'zustand';

export interface SelectPluginSlice {
  // State
  select: {
    selectedIds: string[];
  };
}

export const createSelectPluginSlice: StateCreator<SelectPluginSlice, [], [], SelectPluginSlice> = () => ({
  // Initial state
  select: {
    selectedIds: [],
  },
});