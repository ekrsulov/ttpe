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
  insertPointOnPath: () => void;
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

      // Find path elements
      const pathElements = state.elements.filter((el) => el.type === 'path');

      let closestMatch: {
        element: CanvasElement;
        result: { commandIndex: number; closestPoint: Point; t: number; distance: number };
      } | null = null;
      let minDistance = Infinity;

      // Check each path element
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

      const point = state.screenToCanvas(event.clientX, event.clientY);
      state.emitPointerEvent('pointerdown', event, point);

      // Insert the point if we have a valid hover state
      state.insertPointOnPath();

      // Prevent default to avoid starting selection
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
          // Clear hover state when deactivating
          if (currentState) {
            currentState.updateAddPointHover(null, null, null);
          }
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
