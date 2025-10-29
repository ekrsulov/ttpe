import { useState } from 'react';
import type React from 'react';
import { useCanvasServiceActivation } from './useCanvasServiceActivation';
import { useCanvasController } from '../canvas/controller/CanvasControllerContext';
import { SMOOTH_BRUSH_SERVICE_ID, type SmoothBrushServiceState } from '../canvas/listeners/SmoothBrushListener';
import type { Point } from '../types';

export interface UseEditSmoothBrushParams {
  svgRef: React.RefObject<SVGSVGElement | null>;
  currentMode: string;
  screenToCanvas: (screenX: number, screenY: number) => Point;
  emitPointerEvent: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    event: PointerEvent,
    point: Point
  ) => void;
  isSmoothBrushActive: boolean;
}

export interface UseEditSmoothBrushReturn {
  smoothBrushCursor: Point;
  setSmoothBrushCursor: React.Dispatch<React.SetStateAction<Point>>;
}

/**
 * Hook that manages smooth brush functionality in edit mode.
 * Handles cursor state and native listeners for smooth brush editing.
 */
export function useEditSmoothBrush(
  params: UseEditSmoothBrushParams
): UseEditSmoothBrushReturn {
  const {
    svgRef,
    currentMode,
    screenToCanvas,
    emitPointerEvent,
    isSmoothBrushActive,
  } = params;

  // Local state for smooth brush cursor position (not in store to avoid re-renders)
  const [smoothBrushCursor, setSmoothBrushCursor] = useState<Point>({ x: 0, y: 0 });

  // Setup native listeners for smooth brush
  const controller = useCanvasController();

  useCanvasServiceActivation<SmoothBrushServiceState>({
    serviceId: SMOOTH_BRUSH_SERVICE_ID,
    svgRef,
    selectState: () => ({
      activePlugin: currentMode,
      isSmoothBrushActive,
      screenToCanvas,
      emitPointerEvent,
      getApplySmoothBrush: () => controller.applySmoothBrush ?? (() => {}),
      setSmoothBrushCursor,
    }),
    // Only include dependencies that should trigger state update
    stateDeps: [
      currentMode,
      isSmoothBrushActive,
    ],
  });

  return {
    smoothBrushCursor,
    setSmoothBrushCursor,
  };
}