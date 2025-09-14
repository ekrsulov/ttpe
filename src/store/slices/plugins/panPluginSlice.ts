import type { StateCreator } from 'zustand';

export interface PanPluginSlice {
  // State
  pan: {
    offsetX: number;
    offsetY: number;
  };
}

export const createPanPluginSlice: StateCreator<PanPluginSlice, [], [], PanPluginSlice> = () => ({
  // Initial state
  pan: {
    offsetX: 0,
    offsetY: 0,
  },
});