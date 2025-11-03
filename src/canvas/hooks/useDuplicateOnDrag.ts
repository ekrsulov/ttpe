import type React from 'react';
import { useMemo } from 'react';
import { useCanvasServiceActivation } from './useCanvasServiceActivation';
import { useCanvasStore } from '../../store/canvasStore';
import { DUPLICATE_ON_DRAG_SERVICE_ID, type DuplicateOnDragServiceState } from '../../plugins/duplicateOnDrag/service';
import type { Point } from '../../types';

export interface UseDuplicateOnDragParams {
  svgRef: React.RefObject<SVGSVGElement | null>;
  currentMode: string;
  screenToCanvas: (screenX: number, screenY: number) => Point;
}

/**
 * Hook that manages duplicate on drag functionality.
 * This service is always active and listens for Command+Drag gestures.
 */
export function useDuplicateOnDrag(params: UseDuplicateOnDragParams): void {
  const { svgRef, currentMode, screenToCanvas } = params;
  
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const elements = useCanvasStore((state) => state.elements);
  
  // Memoize the element map to avoid creating a new Map on every render
  const elementMap = useMemo(
    () => new Map(elements.map(el => [el.id, el])),
    [elements]
  );

  useCanvasServiceActivation<DuplicateOnDragServiceState>({
    serviceId: DUPLICATE_ON_DRAG_SERVICE_ID,
    svgRef,
    selectState: () => ({
      activePlugin: currentMode,
      selectedIds,
      elementMap,
      screenToCanvas,
    }),
    stateDeps: [currentMode, selectedIds, elementMap, screenToCanvas],
  });
}
