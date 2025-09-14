import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';

export interface SelectionSlice {
  // State
  selectedIds: string[];

  // Actions
  selectElement: (id: string, multiSelect?: boolean) => void;
  selectElements: (ids: string[]) => void;
  clearSelection: () => void;
  getSelectedElements: () => CanvasElement[];
  getSelectedPathsCount: () => number;
  getSelectedTextsCount: () => number;
  moveSelectedElements: (deltaX: number, deltaY: number) => void;
  updateSelectedPaths: (properties: Partial<import('../../../types').PathData>) => void;
  updateSelectedTexts: (properties: Partial<import('../../../types').TextData>) => void;
}

type SelectionState = {
  selectedIds: string[];
  elements: CanvasElement[];
};

export const createSelectionSlice: StateCreator<SelectionSlice> = (set, get, _api) => ({
  // Initial state
  selectedIds: [],

  // Actions
  selectElement: (id, multiSelect = false) => {
    set((state) => ({
      selectedIds: multiSelect
        ? (state.selectedIds as any).includes(id)
          ? (state.selectedIds as any).filter((selId: string) => selId !== id)
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
    const state = get() as any;
    return state.elements.filter((el: CanvasElement) => (state.selectedIds as any).includes(el.id));
  },

  getSelectedPathsCount: () => {
    const state = get() as any;
    return state.elements.filter((el: CanvasElement) => (state.selectedIds as any).includes(el.id) && el.type === 'path').length;
  },

  getSelectedTextsCount: () => {
    const state = get() as any;
    return state.elements.filter((el: CanvasElement) => (state.selectedIds as any).includes(el.id) && el.type === 'text').length;
  },

  moveSelectedElements: (deltaX, deltaY) => {
    const selectedIds = get().selectedIds;
    const state = get() as any;
    (set as any)((currentState: any) => ({
      elements: currentState.elements.map((el: CanvasElement) => {
        if ((selectedIds as any).includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            return {
              ...el,
              data: {
                ...pathData,
                points: pathData.points.map(point => ({
                  x: point.x + deltaX,
                  y: point.y + deltaY,
                })),
              },
            };
          } else if (el.type === 'text') {
            const textData = el.data as import('../../../types').TextData;
            return {
              ...el,
              data: {
                ...textData,
                x: textData.x + deltaX,
                y: textData.y + deltaY,
              },
            };
          }
        }
        return el;
      }),
    }));
  },

  updateSelectedPaths: (properties) => {
    const selectedIds = get().selectedIds;
    const state = get() as any;
    (set as any)((currentState: any) => ({
      elements: currentState.elements.map((el: CanvasElement) => {
        if ((selectedIds as any).includes(el.id) && el.type === 'path') {
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

  updateSelectedTexts: (properties) => {
    const selectedIds = get().selectedIds;
    (set as any)((currentState: any) => ({
      elements: currentState.elements.map((el: CanvasElement) => {
        if ((selectedIds as any).includes(el.id) && el.type === 'text') {
          const textData = el.data as import('../../../types').TextData;
          return {
            ...el,
            data: {
              ...textData,
              ...properties,
            },
          };
        }
        return el;
      }),
    }));
  },
});