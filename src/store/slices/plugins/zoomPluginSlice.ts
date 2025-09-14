import type { StateCreator } from 'zustand';

export interface ZoomPluginSlice {
  // State
  zoom: {
    level: number;
  };
}

export const createZoomPluginSlice: StateCreator<ZoomPluginSlice, [], [], ZoomPluginSlice> = () => ({
  // Initial state
  zoom: {
    level: 1,
  },
});