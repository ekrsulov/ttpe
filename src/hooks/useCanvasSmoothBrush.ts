import { useCallback, useState, useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { SmoothBrushController } from '../canvasInteractions/SmoothBrushController';
import type { Point } from '../types';
import type { EditPluginSlice } from '../store/slices/plugins/editPluginSlice';

export interface SmoothBrushState {
  isActive: boolean;
  cursorPosition: Point | null;
  smoothBrush: EditPluginSlice['smoothBrush'];
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

  const controller = useMemo(() => new SmoothBrushController({
    activateSmoothBrush: () => useCanvasStore.getState().activateSmoothBrush(),
    deactivateSmoothBrush: () => useCanvasStore.getState().deactivateSmoothBrush(),
    updateSmoothBrushCursor: (x, y) => useCanvasStore.getState().updateSmoothBrushCursor(x, y),
    applySmoothBrush: (x, y) => useCanvasStore.getState().applySmoothBrush(x, y),
    isSmoothBrushActive: () => useCanvasStore.getState().smoothBrush.isActive,
  }), []);

  const activateSmoothBrush = useCallback(() => {
    controller.activate();
  }, [controller]);

  const deactivateSmoothBrush = useCallback(() => {
    controller.deactivate();
  }, [controller]);

  const updateCursorPosition = useCallback((position: Point) => {
    setCursorPosition(position);
    controller.updateCursor(position);
  }, [controller]);

  const applyBrush = useCallback((position: Point) => {
    controller.apply(position);
  }, [controller]);

  return {
    isActive,
    cursorPosition,
    smoothBrush,
    activateSmoothBrush,
    deactivateSmoothBrush,
    updateCursorPosition,
    applyBrush,
  };
};