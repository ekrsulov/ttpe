import type {
  CanvasService,
  CanvasServiceContext,
  CanvasServiceInstance,
} from '../../utils/pluginManager';
import { pluginManager } from '../../utils/pluginManager';
import type { Point, CanvasElement, GroupData } from '../../types';
import { useCanvasStore } from '../../store/canvasStore';

export const DUPLICATE_ON_DRAG_SERVICE_ID = 'duplicate-on-drag-listener';

export interface DuplicateOnDragServiceState {
  activePlugin: string | null;
  selectedIds: string[];
  elementMap: Map<string, CanvasElement>;
  screenToCanvas: (x: number, y: number) => Point;
}

class DuplicateOnDragListenerService implements CanvasService<DuplicateOnDragServiceState> {
  readonly id = DUPLICATE_ON_DRAG_SERVICE_ID;

  private idCounter = 0;

  // Helper function to duplicate an element and its children recursively
  private duplicateElement(
    element: CanvasElement,
    elementMap: Map<string, CanvasElement>,
    store: ReturnType<typeof useCanvasStore.getState>,
    newParentId?: string | null
  ): string {
    const timestamp = this.idCounter++;
    const baseId = element.id.split('-')[0];
    const newId = `${baseId}-copy-${timestamp}`;

    if (element.type === 'group') {
      // Duplicate group and its children recursively, maintaining hierarchy
      const groupData = element.data as GroupData;

      // First, create the group with empty childIds to get its ID
      const tempGroupData = {
        childIds: [],
        name: `${groupData.name} Copy`,
        isLocked: groupData.isLocked,
        isHidden: groupData.isHidden,
        isExpanded: true, // Always expand duplicated groups
        transform: groupData.transform,
      };

      const tempGroupWithoutId = {
        type: 'group' as const,
        parentId: newParentId !== undefined ? newParentId : element.parentId,
        data: tempGroupData,
      };

      console.log(`Creating temp group for ${element.id}`);
      const groupId = store.addElement(tempGroupWithoutId);
      console.log(`Temp group created with id ${groupId}`);

      // Now duplicate all children with the correct parentId
      const newChildIds: string[] = [];
      console.log(`Duplicating children for group ${element.id}, children:`, groupData.childIds);

      for (const childId of groupData.childIds) {
        const child = elementMap.get(childId);
        if (child) {
          console.log(`Duplicating child ${childId} (${child.type})`);
          const newChildId = this.duplicateElement(child, elementMap, store, groupId);
          console.log(`Child ${childId} duplicated as ${newChildId}`);
          newChildIds.push(newChildId);
        } else {
          console.warn(`Child ${childId} not found in elementMap`);
        }
      }

      // Update the group with the correct childIds
      console.log(`Updating group ${groupId} with childIds:`, newChildIds);
      store.updateElement(groupId, { data: { ...tempGroupData, childIds: newChildIds } });
      return groupId;
    } else {
      // Duplicate path element
      const newElementWithoutId = {
        type: 'path' as const,
        parentId: newParentId !== undefined ? newParentId : element.parentId,
        data: element.data,
      };

      console.log(`Duplicating path ${element.id} -> ${newId}`);
      const actualNewId = store.addElement(newElementWithoutId);
      console.log(`Path created with id ${actualNewId}`);
      return actualNewId;
    }
  }

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

      // If the element belongs to a group, find the root group and duplicate it
      let elementToDuplicateId = elementId;
      if (element.parentId) {
        // Find the root group (group with no parent)
        let currentElement = element;
        while (currentElement.parentId) {
          const parent = state.elementMap.get(currentElement.parentId);
          if (!parent) break;
          currentElement = parent;
        }
        elementToDuplicateId = currentElement.id;
      }

      // Duplicate the element (or its root group)
      const store = useCanvasStore.getState();
      const duplicatedIds: string[] = [];

      console.log('handlePointerDown: clicked element:', elementId, 'duplicating:', elementToDuplicateId);

      const elementToDuplicate = state.elementMap.get(elementToDuplicateId);
      if (elementToDuplicate) {
        console.log(`Duplicating element ${elementToDuplicateId} (${elementToDuplicate.type})`);
        const newId = this.duplicateElement(elementToDuplicate, state.elementMap, store);
        console.log(`Element ${elementToDuplicateId} duplicated as ${newId}`);
        duplicatedIds.push(newId);
      }

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
