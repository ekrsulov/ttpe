import type { StateCreator } from 'zustand';
import type { Viewport } from '../../../types';

export interface ViewportSlice {
  // State
  viewport: Viewport;

  // Actions
  setViewport: (viewport: Partial<Viewport>) => void;
  pan: (deltaX: number, deltaY: number) => void;
  zoom: (factor: number, centerX?: number, centerY?: number) => void;
  resetPan: () => void;
  resetZoom: () => void;
}

export const createViewportSlice: StateCreator<ViewportSlice> = (set, _get, _api) => ({
  // Initial state
  viewport: {
    zoom: 1,
    panX: 0,
    panY: 0,
  },

  // Actions
  setViewport: (viewport) => {
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    }));
  },

  pan: (deltaX, deltaY) => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        panX: state.viewport.panX + deltaX,
        panY: state.viewport.panY + deltaY,
      },
    }));
  },

  zoom: (factor, centerX = 0, centerY = 0) => {
    set((state) => {
      const newZoom = Math.max(0.1, Math.min(5, state.viewport.zoom * factor));
      const zoomRatio = newZoom / state.viewport.zoom;

      return {
        viewport: {
          ...state.viewport,
          zoom: newZoom,
          panX: centerX - (centerX - state.viewport.panX) * zoomRatio,
          panY: centerY - (centerY - state.viewport.panY) * zoomRatio,
        },
      };
    });
  },

  resetPan: () => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        panX: 0,
        panY: 0,
      },
    }));
  },

  resetZoom: () => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        zoom: 1,
        panX: 0,
        panY: 0,
      },
    }));
  },
});