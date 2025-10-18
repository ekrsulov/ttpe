import { useEffect, useMemo } from 'react';
import type { RefObject } from 'react';
import { pluginManager } from '../utils/pluginManager';
import { useCanvasController } from '../canvas/controller/CanvasControllerContext';
import { useCanvasEventBus } from '../canvas/CanvasEventBusContext';
import { useCanvasStore } from '../store/canvasStore';
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
  const eventBus = useCanvasEventBus();

  const storeApi = useMemo(
    () => ({
      getState: useCanvasStore.getState,
      subscribe: useCanvasStore.subscribe,
    }),
    []
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !eventBus) {
      return;
    }

    return pluginManager.activateCanvasService(SMOOTH_BRUSH_SERVICE_ID, {
      svg,
      controller,
      eventBus,
      store: storeApi,
    });
  }, [controller, eventBus, storeApi, svgRef]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !eventBus) {
      return;
    }

    const state: SmoothBrushServiceState = {
      activePlugin,
      isSmoothBrushActive,
      screenToCanvas,
      emitPointerEvent,
      applySmoothBrush: controller.applySmoothBrush,
      setSmoothBrushCursor,
    };

    pluginManager.updateCanvasServiceState(SMOOTH_BRUSH_SERVICE_ID, state);
  }, [
    activePlugin,
    controller,
    emitPointerEvent,
    eventBus,
    isSmoothBrushActive,
    screenToCanvas,
    setSmoothBrushCursor,
    svgRef,
  ]);
};
