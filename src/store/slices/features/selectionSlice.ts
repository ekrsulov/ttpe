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

      return {
        selectedIds: multiSelect
          ? state.selectedIds.includes(id)
            ? state.selectedIds.filter((selId: string) => selId !== id)
            : [...state.selectedIds, id]
          : [id],
      };
    });
  },

  selectElements: (ids) => {
    set({ selectedIds: ids });
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
    const selectedIds = get().selectedIds;
    const state = get() as CanvasStore;
    const precision = state.settings.keyboardMovementPrecision;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((currentState) => ({
      elements: currentState.elements.map((el: CanvasElement) => {
        if (selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            return {
              ...el,
              data: translatePathData(pathData, deltaX, deltaY, {
                precision: precision,
                roundToIntegers: precision === 0
              })
            };
          }
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