import type { StateCreator } from 'zustand';
import type { Viewport } from '../../../types';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../../utils';

const MIN_ZOOM = 0.01; // 1%
const MAX_ZOOM = 100; // 10000%

export interface ViewportSlice {
  // State
  viewport: Viewport;

  // Actions
  setViewport: (viewport: Partial<Viewport>) => void;
  pan: (deltaX: number, deltaY: number) => void;
  zoom: (factor: number, centerX?: number, centerY?: number) => void;
  resetPan: () => void;
  resetZoom: () => void;

  // Selectors
  selectViewport: () => Viewport;
  selectZoom: () => number;
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
        panX: formatToPrecision(state.viewport.panX + deltaX, PATH_DECIMAL_PRECISION),
        panY: formatToPrecision(state.viewport.panY + deltaY, PATH_DECIMAL_PRECISION),
      },
    }));
  },

  zoom: (factor, centerX = 0, centerY = 0) => {
    set((state) => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.viewport.zoom * factor));
      const zoomRatio = newZoom / state.viewport.zoom;

      return {
        viewport: {
          ...state.viewport,
          zoom: newZoom,
          panX: formatToPrecision(centerX - (centerX - state.viewport.panX) * zoomRatio, PATH_DECIMAL_PRECISION),
          panY: formatToPrecision(centerY - (centerY - state.viewport.panY) * zoomRatio, PATH_DECIMAL_PRECISION),
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

  // Selectors
  selectViewport: () => _get().viewport,
  selectZoom: () => _get().viewport.zoom,
});