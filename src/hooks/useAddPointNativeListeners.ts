import { useEffect } from 'react';
import type { RefObject } from 'react';
import { pluginManager } from '../utils/pluginManager';
import { useCanvasController } from '../canvas/controller/CanvasControllerContext';
import { useCanvasEventBus } from '../canvas/CanvasEventBusContext';
import { canvasStoreApi } from '../store/canvasStore';
import { ADD_POINT_SERVICE_ID, type AddPointServiceState } from '../canvas/listeners/AddPointListener';
import type { Point } from '../types';

interface UseAddPointNativeListenersParams {
  svgRef: RefObject<SVGSVGElement | null>;
  activePlugin: string | null;
  isAddPointModeActive: boolean;
  screenToCanvas: (screenX: number, screenY: number) => Point;
  emitPointerEvent: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    event: PointerEvent,
    point: Point
  ) => void;
}

export const useAddPointNativeListeners = ({
  svgRef,
  activePlugin,
  isAddPointModeActive,
  screenToCanvas,
  emitPointerEvent,
}: UseAddPointNativeListenersParams): void => {
  const controller = useCanvasController();
  const eventBus = useCanvasEventBus();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !eventBus) {
      return;
    }

    return pluginManager.activateCanvasService(ADD_POINT_SERVICE_ID, {
      svg,
      controller,
      eventBus,
      store: canvasStoreApi,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventBus, svgRef]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !eventBus) {
      return;
    }

    const state: AddPointServiceState = {
      activePlugin,
      isAddPointModeActive,
      elements: controller.elements,
      screenToCanvas,
      emitPointerEvent,
      updateAddPointHover: (position, elementId, segmentInfo) => {
        canvasStoreApi.getState().updateAddPointHover?.(position, elementId, segmentInfo);
      },
      insertPointOnPath: () => {
        canvasStoreApi.getState().insertPointOnPath?.();
      },
    };

    pluginManager.updateCanvasServiceState(ADD_POINT_SERVICE_ID, state);
  }, [
    activePlugin,
    controller.elements,
    emitPointerEvent,
    eventBus,
    isAddPointModeActive,
    screenToCanvas,
    svgRef,
  ]);
};
