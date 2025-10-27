import type { RefObject } from 'react';
import { useCanvasServiceActivation } from './useCanvasServiceActivation';
import { useCanvasController } from '../canvas/controller/CanvasControllerContext';
import { SMOOTH_BRUSH_SERVICE_ID, type SmoothBrushServiceState } from '../canvas/listeners/SmoothBrushListener';
import type { Point } from '../types';

interface UseSmoothBrushNativeListenersParams {
  svgRef: RefObject<SVGSVGElement | null>;
  activePlugin: string | null;
  isSmoothBrushActive: boolean;
  screenToCanvas: (x: number, y: number) => Point;
  emitPointerEvent: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    event: PointerEvent,
    point: Point
  ) => void;
  setSmoothBrushCursor: (point: Point) => void;
}

export const useSmoothBrushNativeListeners = ({
  svgRef,
  activePlugin,
  isSmoothBrushActive,
  screenToCanvas,
  emitPointerEvent,
  setSmoothBrushCursor,
}: UseSmoothBrushNativeListenersParams): void => {
  const controller = useCanvasController();

  useCanvasServiceActivation<SmoothBrushServiceState>({
    serviceId: SMOOTH_BRUSH_SERVICE_ID,
    svgRef,
    selectState: () => ({
      activePlugin,
      isSmoothBrushActive,
      screenToCanvas,
      emitPointerEvent,
      getApplySmoothBrush: () => controller.applySmoothBrush ?? (() => {}),
      setSmoothBrushCursor,
    }),
    // Only include dependencies that should trigger state update
    stateDeps: [
      activePlugin,
      isSmoothBrushActive,
    ],
  });
};
