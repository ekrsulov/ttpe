import { pluginManager } from '../../utils/pluginManager';
import type {
  CanvasService,
  CanvasServiceContext,
  CanvasServiceInstance,
} from '../../utils/pluginManager';
import type { Point, PathData, CanvasElement } from '../../types';
import { findClosestPathSegment } from '../../utils/pathProximityUtils';

export const ADD_POINT_SERVICE_ID = 'add-point-listener';

export interface AddPointServiceState {
  activePlugin: string | null;
  isAddPointModeActive: boolean;
  elements: CanvasElement[];
  selectedIds: string[];
  screenToCanvas: (x: number, y: number) => Point;
  emitPointerEvent: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    event: PointerEvent,
    point: Point
  ) => void;
  updateAddPointHover: (
    position: Point | null,
    elementId: string | null,
    segmentInfo: { commandIndex: number; t: number } | null
  ) => void;
  insertPointOnPath: () => { elementId: string; commandIndex: number; pointIndex: number } | null;
  hasValidHover: () => boolean;
}

class AddPointListenerService implements CanvasService<AddPointServiceState> {
  id = ADD_POINT_SERVICE_ID;

  create({ svg }: CanvasServiceContext): CanvasServiceInstance<AddPointServiceState> {
    let currentState: AddPointServiceState | null = null;
    let listenersAttached = false;

    const getState = () => currentState;

    const handlePointerMove = (event: PointerEvent) => {
      const state = getState();
      if (!state || !state.isAddPointModeActive || state.activePlugin !== 'edit') {
        return;
      }

      // Don't process if clicking on UI elements
      const target = event.target as Element;
      if (target && target.closest) {
        const isUIElement = target.closest('circle, rect, ellipse, .chakra-button, button, input, select');
        if (isUIElement) {
          state.updateAddPointHover(null, null, null);
          return;
        }
      }

      const point = state.screenToCanvas(event.clientX, event.clientY);
      state.emitPointerEvent('pointermove', event, point);

      // Find path elements that are selected
      const pathElements = state.elements.filter(
        (el) => el.type === 'path' && state.selectedIds.includes(el.id)
      );

      // If no paths are selected, don't show hover feedback
      if (pathElements.length === 0) {
        state.updateAddPointHover(null, null, null);
        return;
      }

      let closestMatch: {
        element: CanvasElement;
        result: { commandIndex: number; closestPoint: Point; t: number; distance: number };
      } | null = null;
      let minDistance = Infinity;

      // Check each selected path element
      for (const element of pathElements) {
        const pathData = element.data as PathData;
        const commands = pathData.subPaths.flat();

        const result = findClosestPathSegment(point, commands, 15, 10);
        if (result && result.distance < minDistance) {
          minDistance = result.distance;
          closestMatch = { element, result };
        }
      }

      if (closestMatch) {
        state.updateAddPointHover(
          closestMatch.result.closestPoint,
          closestMatch.element.id,
          { commandIndex: closestMatch.result.commandIndex, t: closestMatch.result.t }
        );
      } else {
        state.updateAddPointHover(null, null, null);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const state = getState();
      if (!state || !state.isAddPointModeActive || state.activePlugin !== 'edit') {
        return;
      }

      // Only handle left click
      if (event.button !== 0) {
        return;
      }

      // Don't process if clicking on UI elements
      const target = event.target as Element;
      if (target && target.closest) {
        const isUIElement = target.closest('circle, rect, ellipse, .chakra-button, button, input, select');
        if (isUIElement) {
          return;
        }
      }

      // Check if we have a valid hover position (cursor is over a path segment)
      const hasValidHover = state.hasValidHover();
      
      if (!hasValidHover) {
        // No valid hover, allow normal selection behavior
        return;
      }
      
      // Insert the point - it will automatically be selected and set to dragging state
      state.insertPointOnPath();

      // Prevent default and stop propagation to avoid starting selection box
      event.preventDefault();
      event.stopPropagation();
    };

    const attachListeners = () => {
      if (listenersAttached) return;
      svg.addEventListener('pointermove', handlePointerMove);
      svg.addEventListener('pointerdown', handlePointerDown, { capture: true });
      listenersAttached = true;
    };

    const detachListeners = () => {
      if (!listenersAttached) return;
      svg.removeEventListener('pointermove', handlePointerMove);
      svg.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      listenersAttached = false;
    };

    return {
      update: (state: AddPointServiceState) => {
        currentState = state;

        if (state.activePlugin === 'edit' && state.isAddPointModeActive) {
          attachListeners();
        } else {
          detachListeners();
          // Note: Don't call updateAddPointHover here as it triggers setState,
          // causing infinite loops. The hover state will be cleared naturally
          // when the mode changes through normal event flow.
        }
      },
      dispose: () => {
        detachListeners();
        currentState = null;
      },
    };
  }
}

pluginManager.registerCanvasService(new AddPointListenerService());
