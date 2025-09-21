import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';
import type { CanvasStore } from '../../canvasStore';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../../utils';

// Helper function to transform SVG path commands by applying a translation
const transformSvgPath = (d: string, deltaX: number, deltaY: number): string => {
  // Split the path into commands and coordinates (only M, L, C, Z)
  const commands = d.split(/([MLCZmlcz])/).filter(cmd => cmd.trim() !== '');
  let result = '';
  let i = 0;

  while (i < commands.length) {
    const command = commands[i];
    if (result) result += ' ';
    result += command;

    // Process coordinates based on command type
    if ('MLCZmlcz'.indexOf(command) !== -1) {
      i++;
      // Collect all numeric values until the next command
      while (i < commands.length && 'MLCZmlcz'.indexOf(commands[i]) === -1) {
        const coords = commands[i].trim().split(/[\s,]+/).map(coord => {
          const parsed = parseFloat(coord);
          return isNaN(parsed) ? 0 : parsed; // Default to 0 if parsing fails
        });

        // Apply translation to coordinate pairs (M, L, C all have x,y pairs)
        if (command.toUpperCase() !== 'Z') {
          for (let j = 0; j < coords.length; j += 2) {
            if (!isNaN(coords[j]) && !isNaN(deltaX)) {
              coords[j] = formatToPrecision(coords[j] + deltaX, PATH_DECIMAL_PRECISION);
            }
            if (!isNaN(coords[j + 1]) && !isNaN(deltaY)) {
              coords[j + 1] = formatToPrecision(coords[j + 1] + deltaY, PATH_DECIMAL_PRECISION);
            }
          }
        }
        result += ' ' + coords.join(' ');
        i++;
      }
    } else {
      i++;
    }
  }

  return result;
};

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
            
            // If element has transform, move the path coordinates directly to avoid confusion with transform origins
            if (pathData.transform && (pathData.transform.scaleX !== 1 || pathData.transform.scaleY !== 1 || pathData.transform.rotation !== 0)) {
              return {
                ...el,
                data: {
                  ...pathData,
                  d: transformSvgPath(pathData.d, deltaX, deltaY),
                },
              };
            } else {
              // No significant transform, move the path coordinates directly
              return {
                ...el,
                data: {
                  ...pathData,
                  d: transformSvgPath(pathData.d, deltaX, deltaY),
                },
              };
            }
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