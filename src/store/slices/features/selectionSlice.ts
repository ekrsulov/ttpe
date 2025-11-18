import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';
import type { CanvasStore } from '../../canvasStore';
import { translatePathData } from '../../../utils/transformationUtils';

export interface SelectionSlice {
  // State
  selectedIds: string[];

  // Actions
  selectElement: (id: string, multiSelect?: boolean) => void;
  selectElements: (ids: string[]) => void;
  clearSelection: () => void;
  getSelectedElements: () => CanvasElement[];
  getSelectedPathsCount: () => number;
  moveSelectedElements: (deltaX: number, deltaY: number) => void;
  updateSelectedPaths: (properties: Partial<import('../../../types').PathData>) => void;
}

export const createSelectionSlice: StateCreator<CanvasStore, [], [], SelectionSlice> = (set, get, _api) => ({
  // Initial state
  selectedIds: [],

  // Actions
  selectElement: (id, multiSelect = false) => {
    set((state) => {
      const fullState = state as CanvasStore; // Cast to access cross-slice properties
      
      // In select mode, when selecting a different path, clear subpath selection
      if (fullState.activePlugin === 'select' && !multiSelect) {
        const currentlySelectedPaths = fullState.selectedIds.filter((selId: string) => {
          const element = fullState.elements.find((el: CanvasElement) => el.id === selId);
          return element && element.type === 'path';
        });
        
        const newElement = fullState.elements.find((el: CanvasElement) => el.id === id);
        const isSelectingDifferentPath = newElement && newElement.type === 'path' && 
          currentlySelectedPaths.length > 0 && !currentlySelectedPaths.includes(id);
        
        if (isSelectingDifferentPath) {
          fullState.selectedSubpaths = [];
        }
      }

      const targetElement = fullState.elements.find((el: CanvasElement) => el.id === id);
      if (!targetElement) {
        return { selectedIds: state.selectedIds };
      }

      if (fullState.isElementHidden && fullState.isElementHidden(targetElement.id)) {
        return { selectedIds: state.selectedIds };
      }

      if (fullState.isElementLocked && fullState.isElementLocked(targetElement.id)) {
        return { selectedIds: state.selectedIds };
      }

      return {
        selectedIds: multiSelect
          ? state.selectedIds.includes(id)
            ? state.selectedIds.filter((selId: string) => selId !== id)
            : [...state.selectedIds, id]
          : [id],
      };
    });
    
    // Refresh trim cache if trim tool is active
    const state = get() as CanvasStore;
    if (state.activePlugin === 'trimPath' && 'refreshTrimCache' in state) {
      // Use setTimeout to ensure state update completes first
      setTimeout(() => {
        const currentState = get() as CanvasStore;
        if ('refreshTrimCache' in currentState) {
          (currentState as any).refreshTrimCache();
        }
      }, 0);
    }
  },

  selectElements: (ids) => {
    const state = get() as CanvasStore;
    const filteredIds = ids.filter((id) => {
      const element = state.elements.find((el: CanvasElement) => el.id === id);
      if (!element) {
        return false;
      }
      if (state.isElementHidden && state.isElementHidden(id)) {
        return false;
      }
      if (state.isElementLocked && state.isElementLocked(id)) {
        return false;
      }
      return true;
    });
    set({ selectedIds: filteredIds });
    
    // Refresh trim cache if trim tool is active
    if (state.activePlugin === 'trimPath' && 'refreshTrimCache' in state) {
      // Use setTimeout to ensure state update completes first
      setTimeout(() => {
        const currentState = get() as CanvasStore;
        if ('refreshTrimCache' in currentState) {
          (currentState as any).refreshTrimCache();
        }
      }, 0);
    }
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  getSelectedElements: () => {
    const state = get() as CanvasStore;
    return state.elements.filter((el: CanvasElement) => state.selectedIds.includes(el.id));
  },

  getSelectedPathsCount: () => {
    const state = get() as CanvasStore;
    return state.elements.filter((el: CanvasElement) => state.selectedIds.includes(el.id) && el.type === 'path').length;
  },

  moveSelectedElements: (deltaX, deltaY) => {
    const state = get() as CanvasStore;
    const selectedIds = state.selectedIds;
    if (selectedIds.length === 0) {
      return;
    }

    const precision = state.settings.keyboardMovementPrecision;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;

    const elementMap = new Map<string, CanvasElement>();
    state.elements.forEach((element) => {
      elementMap.set(element.id, element);
    });

    const selectedSet = new Set(selectedIds);
    const groupsToMoveIds = new Set<string>();

    selectedIds.forEach((id) => {
      const element = elementMap.get(id);
      if (!element) {
        return;
      }

      if (element.type === 'group') {
        groupsToMoveIds.add(element.id);
      }

      let currentParentId = element.parentId ?? null;
      const visitedAncestors = new Set<string>();
      while (currentParentId) {
        if (visitedAncestors.has(currentParentId)) {
          break;
        }
        visitedAncestors.add(currentParentId);

        const parent = elementMap.get(currentParentId);
        if (parent && parent.type === 'group') {
          groupsToMoveIds.add(parent.id);
          currentParentId = parent.parentId ?? null;
        } else {
          break;
        }
      }
    });

    const descendantIds = new Set<string>();
    groupsToMoveIds.forEach((groupId) => {
      const descendants = state.getGroupDescendants ? state.getGroupDescendants(groupId) : [];
      descendants.forEach((descendantId) => descendantIds.add(descendantId));
    });

    const movedPathIds = new Set<string>();
    const movedGroupIds = new Set<string>();

    setStore((currentState) => ({
      elements: currentState.elements.map((el: CanvasElement) => {
        if (el.type === 'path') {
          if (descendantIds.has(el.id) || (selectedSet.has(el.id) && !movedPathIds.has(el.id))) {
            if (movedPathIds.has(el.id)) {
              return el;
            }
            movedPathIds.add(el.id);
            const pathData = el.data as import('../../../types').PathData;
            return {
              ...el,
              data: translatePathData(pathData, deltaX, deltaY, {
                precision: precision,
                roundToIntegers: precision === 0
              })
            };
          }
          return el;
        }

        if (el.type === 'group' && (groupsToMoveIds.has(el.id) || descendantIds.has(el.id))) {
          if (movedGroupIds.has(el.id)) {
            return el;
          }
          movedGroupIds.add(el.id);
          const transform = el.data.transform ?? {
            translateX: 0,
            translateY: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          };
          return {
            ...el,
            data: {
              ...el.data,
              transform: {
                ...transform,
                translateX: transform.translateX + deltaX,
                translateY: transform.translateY + deltaY,
              },
            },
          };
        }

        return el;
      }),
    }));
  },

  updateSelectedPaths: (properties) => {
    const selectedIds = get().selectedIds;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((currentState) => ({
      elements: currentState.elements.map((el: CanvasElement) => {
        if (selectedIds.includes(el.id) && el.type === 'path') {
          const pathData = el.data as import('../../../types').PathData;
          return {
            ...el,
            data: {
              ...pathData,
              ...properties,
            },
          };
        }
        return el;
      }),
    }));
  },
});