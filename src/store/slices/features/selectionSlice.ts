import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';
import type { CanvasStore } from '../../canvasStore';

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

export const createSelectionSlice: StateCreator<SelectionSlice> = (set, get, _api) => ({
  // Initial state
  selectedIds: [],

  // Actions
  selectElement: (id, multiSelect = false) => {
    set((state) => ({
      selectedIds: multiSelect
        ? state.selectedIds.includes(id)
          ? state.selectedIds.filter((selId: string) => selId !== id)
          : [...state.selectedIds, id]
        : [id],
    }));
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
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((currentState) => ({
      elements: currentState.elements.map((el: CanvasElement) => {
        if (selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            
            // Directly translate all points in the path
            const translatedSubPaths = pathData.subPaths.map(subpath => 
              subpath.map(cmd => {
                const translatedCmd = { ...cmd };
                
                if (cmd.type === 'M' || cmd.type === 'L') {
                  (translatedCmd as { position: import('../../../types').Point }).position = {
                    x: cmd.position.x + deltaX,
                    y: cmd.position.y + deltaY
                  };
                } else if (cmd.type === 'C') {
                  (translatedCmd as import('../../../types').Command & { type: 'C' }).controlPoint1 = {
                    ...cmd.controlPoint1,
                    x: cmd.controlPoint1.x + deltaX,
                    y: cmd.controlPoint1.y + deltaY
                  };
                  (translatedCmd as import('../../../types').Command & { type: 'C' }).controlPoint2 = {
                    ...cmd.controlPoint2,
                    x: cmd.controlPoint2.x + deltaX,
                    y: cmd.controlPoint2.y + deltaY
                  };
                  (translatedCmd as import('../../../types').Command & { type: 'C' }).position = {
                    x: cmd.position.x + deltaX,
                    y: cmd.position.y + deltaY
                  };
                }
                // Z commands have no points to translate
                
                return translatedCmd;
              })
            );
            
            return {
              ...el,
              data: {
                ...pathData,
                subPaths: translatedSubPaths
              }
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