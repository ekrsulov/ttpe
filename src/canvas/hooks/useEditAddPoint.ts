import type { RefObject } from 'react';
import { useCanvasServiceActivation } from './useCanvasServiceActivation';
import { useCanvasController } from '../controller/CanvasControllerContext';
import { canvasStoreApi } from '../../store/canvasStore';
import { ADD_POINT_SERVICE_ID, type AddPointServiceState } from '../listeners/AddPointListener';
import type { Point } from '../../types';

interface UseEditAddPointParams {
  svgRef: RefObject<SVGSVGElement | null>;
  activePlugin: string | null;
  isAddPointModeActive: boolean;
  zoom: number;
  screenToCanvas: (screenX: number, screenY: number) => Point;
  emitPointerEvent: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    event: PointerEvent,
    point: Point
  ) => void;
}

export const useEditAddPoint = ({
  svgRef,
  activePlugin,
  isAddPointModeActive,
  zoom,
  screenToCanvas,
  emitPointerEvent,
}: UseEditAddPointParams): void => {
  const controller = useCanvasController();

  useCanvasServiceActivation<AddPointServiceState>({
    serviceId: ADD_POINT_SERVICE_ID,
    svgRef,
    selectState: () => ({
      activePlugin,
      isAddPointModeActive,
      elements: controller.elements,
      selectedIds: controller.selectedIds,
      zoom,
      screenToCanvas,
      emitPointerEvent,
      updateAddPointHover: (position, elementId, segmentInfo) => {
        canvasStoreApi.getState().updateAddPointHover?.(position, elementId, segmentInfo);
      },
      insertPointOnPath: () => {
        return canvasStoreApi.getState().insertPointOnPath?.() ?? null;
      },
      hasValidHover: () => {
        const addPointMode = canvasStoreApi.getState().addPointMode;
        return addPointMode?.hoverPosition !== null && addPointMode?.hoverPosition !== undefined;
      },
    }),
    // Only include dependencies that should trigger state update
    // Don't include controller.elements or controller.selectedIds as they change too frequently
    stateDeps: [
      activePlugin,
      isAddPointModeActive,
      zoom,
    ],
  });
};
