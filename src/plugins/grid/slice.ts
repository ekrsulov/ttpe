import type { StateCreator } from 'zustand';

export interface GridPluginSlice {
  // State
  grid: {
    enabled: boolean;
    snapEnabled: boolean;
    spacing: number; // pixels
    showRulers: boolean; // show coordinate labels
  };

  // Actions
  updateGridState: (state: Partial<GridPluginSlice['grid']>) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

export const createGridPluginSlice: StateCreator<GridPluginSlice, [], [], GridPluginSlice> = (set, get) => {
  return {
    // Initial state
    grid: {
      enabled: false,
      snapEnabled: false, // Disable snap by default
      spacing: 20, // 20 pixels default spacing
      showRulers: false, // Don't show rulers by default
    },

    // Actions
    updateGridState: (state) => {
      set((current) => ({
        grid: { ...current.grid, ...state },
      }));
    },

    snapToGrid: (x, y) => {
      const grid = get().grid;
      if (!grid.snapEnabled) {
        return { x, y };
      }

      const snappedX = Math.round(x / grid.spacing) * grid.spacing;
      const snappedY = Math.round(y / grid.spacing) * grid.spacing;

      return { x: snappedX, y: snappedY };
    },
  };
};