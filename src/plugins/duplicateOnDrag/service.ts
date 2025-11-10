import type {
  CanvasService,
  CanvasServiceContext,
  CanvasServiceInstance,
} from '../../utils/pluginManager';
import { pluginManager } from '../../utils/pluginManager';
import type { Point, CanvasElement } from '../../types';
import { useCanvasStore } from '../../store/canvasStore';
import { duplicateElements } from '../../utils/duplicationUtils';

export const DUPLICATE_ON_DRAG_SERVICE_ID = 'duplicate-on-drag-listener';

export interface DuplicateOnDragServiceState {
  activePlugin: string | null;
  selectedIds: string[];
  elementMap: Map<string, CanvasElement>;
  screenToCanvas: (x: number, y: number) => Point;
}

class DuplicateOnDragListenerService implements CanvasService<DuplicateOnDragServiceState> {
  readonly id = DUPLICATE_ON_DRAG_SERVICE_ID;

  create({ svg }: CanvasServiceContext): CanvasServiceInstance<DuplicateOnDragServiceState> {
    let currentState: DuplicateOnDragServiceState | null = null;
    let listenersAttached = false;
    let isDuplicating = false;
    let originalElementId: string | null = null;
    let lastPoint: Point | null = null;

    const getState = () => currentState;

    const handlePointerDown = (event: PointerEvent) => {
      const state = getState();
      if (!state) return;

      // Only trigger on Command/Meta key + left click
      if (!event.metaKey || event.button !== 0) return;

      // Only work when select tool is active
      if (state.activePlugin !== 'select') return;

      const point = state.screenToCanvas(event.clientX, event.clientY);
      
      // Check if we're clicking on an element
      const targetElement = event.target as Element;
      const elementId = targetElement?.getAttribute('data-element-id');
      
      if (!elementId) return;

      const element = state.elementMap.get(elementId);
      if (!element) return;

      // Check if the clicked element is among the selected elements
      const isElementSelected = state.selectedIds.includes(elementId);
      if (!isElementSelected) return;

      // Duplicate all selected elements using consolidated utility
      // Don't apply auto offset - user controls position with drag
      const store = useCanvasStore.getState();
      const duplicatedIds = duplicateElements(
        state.selectedIds,
        state.elementMap,
        store.addElement,
        store.updateElement,
        { applyAutoOffset: false }
      );

      // Store state for movement - move the duplicated element
      originalElementId = duplicatedIds[0]; // Move the duplicated element
      lastPoint = point;
      isDuplicating = true;

      // Prevent default to avoid starting other interactions
      event.preventDefault();
      event.stopPropagation();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDuplicating || !originalElementId || !lastPoint) return;

      const state = getState();
      if (!state) return;

      const point = state.screenToCanvas(event.clientX, event.clientY);
      
      // Calculate the delta from last position (incremental movement)
      const deltaX = point.x - lastPoint.x;
      const deltaY = point.y - lastPoint.y;

      // Only move if there's actual movement
      if (Math.abs(deltaX) > 0.01 || Math.abs(deltaY) > 0.01) {
        // Move the original selected element
        const store = useCanvasStore.getState();
        store.moveSelectedElements(deltaX, deltaY);

        // Update last point for next move
        lastPoint = point;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    const handlePointerUp = (_event: PointerEvent) => {
      if (!isDuplicating) return;

      // That's it! The copies are in the original positions,
      // the original elements have been moved to the new positions
      
      // Reset state
      isDuplicating = false;
      originalElementId = null;
      lastPoint = null;
    };

    const attachListeners = () => {
      if (listenersAttached) return;
      
      // Use capture phase to intercept before other handlers
      svg.addEventListener('pointerdown', handlePointerDown, { capture: true });
      svg.addEventListener('pointermove', handlePointerMove, { capture: true });
      svg.addEventListener('pointerup', handlePointerUp, { capture: true });
      svg.addEventListener('pointercancel', handlePointerUp, { capture: true });
      
      listenersAttached = true;
    };

    const detachListeners = () => {
      if (!listenersAttached) return;
      
      svg.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      svg.removeEventListener('pointermove', handlePointerMove, { capture: true });
      svg.removeEventListener('pointerup', handlePointerUp, { capture: true });
      svg.removeEventListener('pointercancel', handlePointerUp, { capture: true });
      
      listenersAttached = false;
    };

    attachListeners();

    return {
      update: (state: DuplicateOnDragServiceState) => {
        currentState = state;
      },
      dispose: () => {
        detachListeners();
        currentState = null;
      },
    };
  }
}

export const duplicateOnDragService = new DuplicateOnDragListenerService();

// Register the service with the plugin manager
pluginManager.registerCanvasService(duplicateOnDragService);
