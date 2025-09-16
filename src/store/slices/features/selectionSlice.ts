import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';

// Helper function to transform SVG path commands by applying a translation
const transformSvgPath = (d: string, deltaX: number, deltaY: number): string => {
  // Split the path into commands and coordinates
  const commands = d.split(/([MLHVCSQTAZmlhvcsqtaz])/).filter(cmd => cmd.trim() !== '');
  let result = '';
  let i = 0;
  
  while (i < commands.length) {
    const command = commands[i];
    result += command;
    
    // If this is a command that takes coordinates, process the next values
    if ('MLHVCSQTAZmlhvcsqtaz'.indexOf(command) !== -1) {
      i++;
      // Collect all numeric values until the next command
      while (i < commands.length && 'MLHVCSQTAZmlhvcsqtaz'.indexOf(commands[i]) === -1) {
        const coords = commands[i].trim().split(/[\s,]+/).map(parseFloat);
        if (coords.length >= 2) {
          // Apply translation to coordinate pairs
          for (let j = 0; j < coords.length; j += 2) {
            coords[j] += deltaX;     // x coordinate
            coords[j + 1] += deltaY; // y coordinate
          }
          result += ' ' + coords.join(' ');
        }
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
  getSelectedTextsCount: () => number;
  moveSelectedElements: (deltaX: number, deltaY: number) => void;
  updateSelectedPaths: (properties: Partial<import('../../../types').PathData>) => void;
  updateSelectedTexts: (properties: Partial<import('../../../types').TextData>) => void;
}

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
    (set as any)((currentState: any) => ({
      elements: currentState.elements.map((el: CanvasElement) => {
        if ((selectedIds as any).includes(el.id)) {
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
          } else if (el.type === 'text') {
            const textData = el.data as import('../../../types').TextData;
            
            // If element has transform, move the text coordinates directly to avoid confusion with transform origins
            if (textData.transform && (textData.transform.scaleX !== 1 || textData.transform.scaleY !== 1 || textData.transform.rotation !== 0)) {
              return {
                ...el,
                data: {
                  ...textData,
                  x: textData.x + deltaX,
                  y: textData.y + deltaY,
                },
              };
            } else {
              // No significant transform, move the coordinates directly
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
        }
        return el;
      }),
    }));
  },

  updateSelectedPaths: (properties) => {
    const selectedIds = get().selectedIds;
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