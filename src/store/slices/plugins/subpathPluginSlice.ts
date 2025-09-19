import type { StateCreator } from 'zustand';

export interface SubpathPluginSlice {
  // State
  subpath: {
    isDragging: boolean;
    draggedSubpath: { elementId: string; subpathIndex: number } | null;
    initialPositions: Array<{
      elementId: string;
      subpathIndex: number;
      x: number;
      y: number;
    }>;
    originalPathData: string | null; // Store original path data for real-time updates
    startX: number;
    startY: number;
  };

  // Actions
  startDraggingSubpath: (elementId: string, subpathIndex: number, startX: number, startY: number, originalPathData: string) => void;
  updateDraggingSubpath: (x: number, y: number) => void;
  stopDraggingSubpath: () => void;
}

export const createSubpathPluginSlice: StateCreator<SubpathPluginSlice, [], [], SubpathPluginSlice> = (set) => ({
  // Initial state
  subpath: {
    isDragging: false,
    draggedSubpath: null,
    initialPositions: [],
    originalPathData: null,
    startX: 0,
    startY: 0,
  },

  // Actions
  startDraggingSubpath: (elementId, subpathIndex, startX, startY, originalPathData) => {
    set({
      subpath: {
        isDragging: true,
        draggedSubpath: { elementId, subpathIndex },
        initialPositions: [{ elementId, subpathIndex, x: startX, y: startY }],
        originalPathData,
        startX,
        startY,
      },
    });
  },

  updateDraggingSubpath: (_x, _y) => {
    // Don't update the start position - we need to keep the initial start position
    // for calculating deltas. The current position is passed as parameters.
  },

  stopDraggingSubpath: () => {
    set({
      subpath: {
        isDragging: false,
        draggedSubpath: null,
        initialPositions: [],
        originalPathData: null,
        startX: 0,
        startY: 0,
      },
    });
  },
});