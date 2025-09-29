import { useCallback, useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { Point } from '../types';

export interface SmoothBrushState {
  isActive: boolean;
  cursorPosition: Point | null;
}

export interface SmoothBrushActions {
  activateSmoothBrush: () => void;
  deactivateSmoothBrush: () => void;
  updateCursorPosition: (position: Point) => void;
  applyBrush: (position: Point) => void;
}

export type UseCanvasSmoothBrushReturn = SmoothBrushState & SmoothBrushActions;

/**
 * Hook for managing smooth brush functionality
 * Handles smooth brush activation, cursor updates, and application
 */
export const useCanvasSmoothBrush = (): UseCanvasSmoothBrushReturn => {
  const smoothBrush = useCanvasStore(state => state.smoothBrush);
  const isActive = smoothBrush.isActive;
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null);

  const activateSmoothBrush = useCallback(() => {
    useCanvasStore.getState().activateSmoothBrush();
  }, []);

  const deactivateSmoothBrush = useCallback(() => {
    useCanvasStore.getState().deactivateSmoothBrush();
  }, []);

  const updateCursorPosition = useCallback((position: Point) => {
    if (isActive) {
      setCursorPosition(position);
      // Also update the store's cursor position
      useCanvasStore.getState().updateSmoothBrushCursor(position.x, position.y);
    }
  }, [isActive]);

  const applyBrush = useCallback((position: Point) => {
    if (!isActive) return;

    // Apply smooth brush using the store's function
    useCanvasStore.getState().applySmoothBrush(position.x, position.y);
  }, [isActive]);

  return {
    isActive,
    cursorPosition,
    activateSmoothBrush,
    deactivateSmoothBrush,
    updateCursorPosition,
    applyBrush,
  };
};