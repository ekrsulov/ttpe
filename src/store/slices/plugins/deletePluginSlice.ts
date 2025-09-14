import type { StateCreator } from 'zustand';

export interface DeletePluginSlice {
  // State
  delete: Record<string, never>;
}

export const createDeletePluginSlice: StateCreator<DeletePluginSlice, [], [], DeletePluginSlice> = () => ({
  // Initial state
  delete: {},
});