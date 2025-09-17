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
    startX: number;
    startY: number;
  };

  // Actions
  startDraggingSubpath: (elementId: string, subpathIndex: number, startX: number, startY: number) => void;
  updateDraggingSubpath: (x: number, y: number) => void;
  stopDraggingSubpath: () => void;
}

export const createSubpathPluginSlice: StateCreator<SubpathPluginSlice, [], [], SubpathPluginSlice> = (set) => ({
  // Initial state
  subpath: {
    isDragging: false,
    draggedSubpath: null,
    initialPositions: [],
    startX: 0,
    startY: 0,
  },

  // Actions
  startDraggingSubpath: (elementId, subpathIndex, startX, startY) => {
    set({
      subpath: {
        isDragging: true,
        draggedSubpath: { elementId, subpathIndex },
        initialPositions: [{ elementId, subpathIndex, x: startX, y: startY }],
        startX,
        startY,
      },
    });
  },

  updateDraggingSubpath: (x, y) => {
    set((state) => ({
      subpath: {
        ...state.subpath,
        startX: x,
        startY: y,
      },
    }));
  },

  stopDraggingSubpath: () => {
    set({
      subpath: {
        isDragging: false,
        draggedSubpath: null,
        initialPositions: [],
        startX: 0,
        startY: 0,
      },
    });
  },
});