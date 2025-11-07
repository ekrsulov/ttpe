import type { StateCreator } from 'zustand';
import type { CanvasElement, GroupElement, PathData, PathElement } from '../../types';
import type { CanvasStore } from '../canvasStore';
import { performPathUnion as performUnionOp, performPathSubtraction, performPathUnionPaperJS, performPathIntersect, performPathExclude, performPathDivide } from '../../utils/path';
// Removed unused imports: commandsToString, measurePath (now in exportUtils), getSelectedSubpathElements (not used in this file)
import { getSelectedPaths } from '../utils/pluginSliceHelpers';
import { exportSelection } from '../../utils/exportUtils';
import {
  CANVAS_MODE_MACHINE,
  transitionCanvasMode,
  type CanvasMode,
} from '../../canvas/modes/CanvasModeMachine';

export interface BaseSlice {
  // State
  elements: CanvasElement[];
  activePlugin: string | null;
  documentName: string;
  showFilePanel: boolean;
  showSettingsPanel: boolean;
  isVirtualShiftActive: boolean; // Virtual shift mode for mobile/touch devices
  
  // Style eyedropper state
  styleEyedropper: {
    isActive: boolean;
    copiedStyle: {
      strokeWidth: number;
      strokeColor: string;
      strokeOpacity: number;
      fillColor: string;
      fillOpacity: number;
      strokeLinecap?: 'butt' | 'round' | 'square';
      strokeLinejoin?: 'miter' | 'round' | 'bevel';
      fillRule?: 'nonzero' | 'evenodd';
      strokeDasharray?: string;
    } | null;
  };
  
  // Settings
  settings: {
    keyboardMovementPrecision: number; // Number of decimal places for keyboard movement (0 = integers)
    showRenderCountBadges: boolean; // Show debug render count badges
    showMinimap: boolean; // Show minimap overlay
    showTooltips: boolean; // Show tooltips on desktop
    defaultStrokeColor: string; // Default stroke color for new drawing operations
    scaleStrokeWithZoom: boolean; // Scale stroke width with zoom level
    exportPadding: number; // Padding in pixels when exporting SVG/PNG
  };

  // Actions
  addElement: (element: Omit<CanvasElement, 'id' | 'zIndex'>) => string;
  updateElement: (id: string, updates: Omit<Partial<CanvasElement>, 'data'> & { data?: unknown }) => void;
  deleteElement: (id: string) => void;
  deleteSelectedElements: () => void;
  setActivePlugin: (plugin: string | null) => void;
  setMode: (mode: string) => void;
  setDocumentName: (name: string) => void;
  setShowFilePanel: (show: boolean) => void;
  setShowSettingsPanel: (show: boolean) => void;
  setVirtualShift: (active: boolean) => void;
  toggleVirtualShift: () => void;
  updateSettings: (updates: Partial<BaseSlice['settings']>) => void;
  saveDocument: () => void;
  loadDocument: (append?: boolean) => Promise<void>;
  saveAsSvg: (selectedOnly?: boolean) => void;
  saveAsPng: (selectedOnly?: boolean) => void;
  performPathUnion: () => void;
  performPathUnionPaperJS: () => void;
  performPathSubtraction: () => void;
  performPathIntersect: () => void;
  performPathExclude: () => void;
  performPathDivide: () => void;
  
  // Style eyedropper actions
  activateStyleEyedropper: () => void;
  deactivateStyleEyedropper: () => void;
  copyStyleFromPath: (pathId: string) => void;
  applyStyleToPath: (pathId: string) => void;
}

// Generic handler for boolean path operations
const performBooleanOperation = (
  state: CanvasStore,
  operation: (paths: PathData[]) => PathData | null,
  minPaths: number = 2
) => {
  const allPaths = getSelectedPaths(state.elements, state.selectedIds, state.selectedSubpaths ?? []);

  if (allPaths.length < minPaths) return;

  const result = operation(allPaths);
  if (result) {
    // Replace the first selected element with the result
    const firstSelectedId = state.selectedIds[0] || (state.selectedSubpaths ?? [])[0]?.elementId;
    if (firstSelectedId) {
      state.updateElement(firstSelectedId, { data: result });
      
      // Remove other selected elements
      const idsToRemove = [
        ...state.selectedIds.filter(id => id !== firstSelectedId),
        ...(state.selectedSubpaths ?? []).slice(1).map(sp => sp.elementId)
      ].filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates
      
      idsToRemove.forEach(id => {
        state.deleteElement(id);
      });
    }
  }
  // If result is null, do nothing (operation not supported for these paths)

  // Clear selection after operation
  state.clearSelection();
  state.clearSubpathSelection?.();
};

// Generic handler for binary boolean path operations
const performBinaryBooleanOperation = (
  state: CanvasStore,
  operation: (path1: PathData, path2: PathData) => PathData | null
) => {
  const allPaths = getSelectedPaths(state.elements, state.selectedIds, state.selectedSubpaths ?? []);

  if (allPaths.length !== 2) return;

  const result = operation(allPaths[0], allPaths[1]);
  if (result) {
    // Replace the first selected element with the result
    const firstSelectedId = state.selectedIds[0] || (state.selectedSubpaths ?? [])[0]?.elementId;
    if (firstSelectedId) {
      state.updateElement(firstSelectedId, { data: result });
      
      // Remove the second selected element
      const secondSelectedId = state.selectedIds[1] || (state.selectedSubpaths ?? [])[1]?.elementId;
      if (secondSelectedId && secondSelectedId !== firstSelectedId) {
        state.deleteElement(secondSelectedId);
      }
    }
  }

  // Clear selection after operation
  state.clearSelection();
  state.clearSubpathSelection?.();
};

export const createBaseSlice: StateCreator<BaseSlice> = (set, get, _api) => {
  const applyModeTransition = (requestedMode: string) => {
    const state = get() as CanvasStore;
    const currentMode = (state.activePlugin ?? CANVAS_MODE_MACHINE.initial) as CanvasMode;
    const targetMode = (requestedMode || CANVAS_MODE_MACHINE.initial) as CanvasMode;

    const result = transitionCanvasMode(currentMode, {
      type: 'ACTIVATE',
      value: targetMode,
    });

    if (!result.changed) {
      return;
    }

    set({ activePlugin: result.mode });

    const updatedState = get() as CanvasStore;
    for (const action of result.actions) {
      switch (action) {
        case 'clearGuidelines':
          updatedState.clearGuidelines?.();
          break;
        case 'clearSubpathSelection':
          updatedState.clearSubpathSelection?.();
          break;
        case 'clearSelectedCommands':
          updatedState.clearSelectedCommands?.();
          break;
        default:
          break;
      }
    }
  };

  return ({
  // Initial state
  elements: [],
  activePlugin: 'select',
  documentName: 'Untitled Document',
  showFilePanel: false,
  showSettingsPanel: false,
  isVirtualShiftActive: false,
  
  // Style eyedropper initial state
  styleEyedropper: {
    isActive: false,
    copiedStyle: null,
  },
  
  // Settings with defaults
  settings: {
    keyboardMovementPrecision: 2, // Default to 0 (integers only)
    showRenderCountBadges: false, // Show badges in development by default
    showMinimap: false, // Show minimap by default
    showTooltips: false, // Show tooltips by default
    defaultStrokeColor: '#000000',
    scaleStrokeWithZoom: false, // Default to false (strokes don't scale with zoom)
    exportPadding: 20, // Default padding for SVG/PNG export
  },

  // Actions
  addElement: (element) => {
    const id = `element_${Date.now()}_${Math.random()}`;
    const parentId = element.parentId ?? null;
    const existingElements = get().elements;
    const zIndex = parentId
      ? existingElements.filter((el) => el.parentId === parentId).length
      : existingElements.filter((el) => !el.parentId).length;

    const newElement: CanvasElement = element.type === 'group'
      ? {
          id,
          type: 'group',
          parentId,
          zIndex,
          data: {
            ...(element as GroupElement).data,
            transform: (element as GroupElement).data.transform ?? {
              translateX: 0,
              translateY: 0,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            },
          },
        }
      : {
          id,
          type: 'path',
          parentId,
          zIndex,
          data: (element as PathElement).data,
        };

    set((state) => ({
      elements: [...state.elements, newElement],
    }));
    return id;
  },

  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map((element) => {
        if (element.id !== id) {
          return element;
        }

        if (element.type === 'group') {
          const groupUpdates = updates as Omit<Partial<GroupElement>, 'data'> & { data?: unknown };
          const updatedData = groupUpdates.data
            ? { ...element.data, ...(groupUpdates.data as Record<string, unknown>) }
            : element.data;
          return { ...element, ...groupUpdates, data: updatedData };
        }

        const pathUpdates = updates as Omit<Partial<PathElement>, 'data'> & { data?: unknown };
        const updatedPathData = pathUpdates.data
          ? { ...element.data, ...(pathUpdates.data as Record<string, unknown>) }
          : element.data;
        return { ...element, ...pathUpdates, data: updatedPathData };
      }) as CanvasElement[],
    }));
  },

  deleteElement: (id) => {
    set((state) => {
      const currentState = state as CanvasStore;
      const elementToDelete = currentState.elements.find((element) => element.id === id);
      if (!elementToDelete) {
        return { elements: currentState.elements };
      }

      const parentId = elementToDelete.parentId ?? null;
      const idsToDelete: string[] = [id];
      let updatedElements = currentState.elements;

      if (elementToDelete.type === 'group') {
        // Collect all descendants to delete recursively
        const collectDescendants = (group: GroupElement, elements: CanvasElement[]): string[] => {
          const descendants: string[] = [];
          const queue = [...group.data.childIds];
          const elementMap = new Map(elements.map(el => [el.id, el]));

          while (queue.length > 0) {
            const childId = queue.shift();
            if (!childId) continue;
            descendants.push(childId);
            const childElement = elementMap.get(childId);
            if (childElement && childElement.type === 'group') {
              queue.push(...childElement.data.childIds);
            }
          }

          return descendants;
        };

        const descendants = collectDescendants(elementToDelete as GroupElement, currentState.elements);
        idsToDelete.push(...descendants);

        // Remove all elements in the group and its descendants
        updatedElements = currentState.elements.filter((element) => !idsToDelete.includes(element.id));
      } else {
        // For non-group elements, just remove this element
        updatedElements = currentState.elements.filter((element) => element.id !== id);
      }

      // Update childIds in remaining elements to remove references to deleted elements
      updatedElements = updatedElements.map((element) => {
        if (element.type === 'group') {
          const filteredChildIds = element.data.childIds.filter((childId) => !idsToDelete.includes(childId));
          if (filteredChildIds.length !== element.data.childIds.length) {
            return {
              ...element,
              data: {
                ...element.data,
                childIds: filteredChildIds,
              },
            };
          }
        }
        return element;
      });

      // If deleting a non-group element from a group that now has only one child, ungroup it
      if (elementToDelete.type !== 'group' && parentId) {
        const parentElement = updatedElements.find((el) => el.id === parentId);
        if (parentElement && parentElement.type === 'group' && parentElement.data.childIds.length === 1) {
          const singleChildId = parentElement.data.childIds[0];
          const grandParentId = parentElement.parentId ?? null;

          // Update the single child's parentId to the grandparent
          updatedElements = updatedElements.map((el) =>
            el.id === singleChildId ? { ...el, parentId: grandParentId } : el
          );

          // Remove the group
          updatedElements = updatedElements.filter((el) => el.id !== parentId);

          // Update the grandparent's childIds to replace the group with the single child
          if (grandParentId) {
            updatedElements = updatedElements.map((el) => {
              if (el.id === grandParentId && el.type === 'group') {
                const newChildIds = el.data.childIds.map((childId) =>
                  childId === parentId ? singleChildId : childId
                );
                return {
                  ...el,
                  data: {
                    ...el.data,
                    childIds: newChildIds,
                  },
                };
              }
              return el;
            });
          }
        }
      }

      return { elements: updatedElements };
    });
    // Clear guidelines when an element is deleted to avoid inconsistencies
    const state = get() as CanvasStore;
    if (state.clearGuidelines) {
      state.clearGuidelines();
    }
  },

  deleteSelectedElements: () => {
    const state = get() as CanvasStore;
    state.selectedIds.forEach((id: string) => state.deleteElement(id));
    state.clearSelection();
  },

  setActivePlugin: (plugin) => {
    if (!plugin) {
      set({ activePlugin: null });
      return;
    }
    applyModeTransition(plugin);
  },

  setMode: (mode) => {
    applyModeTransition(mode);
  },

  setDocumentName: (name) => {
    set({ documentName: name });
  },

  setShowFilePanel: (show) => {
    set({ showFilePanel: show });
  },

  setShowSettingsPanel: (show) => {
    set({ showSettingsPanel: show });
  },

  setVirtualShift: (active) => {
    set({ isVirtualShiftActive: active });
  },

  toggleVirtualShift: () => {
    set((state) => ({ isVirtualShiftActive: !state.isVirtualShiftActive }));
  },

  updateSettings: (updates) => {
    set((state) => ({
      settings: { ...state.settings, ...updates }
    }));
  },

  saveDocument: () => {
    const state = get() as CanvasStore;
    const documentData = {
      documentName: state.documentName,
      elements: state.elements,
      viewport: state.viewport,
      version: '1.0'
    };

    const dataStr = JSON.stringify(documentData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.documentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  saveAsSvg: (selectedOnly: boolean = false) => {
    const state = get() as CanvasStore;
    exportSelection('svg', state.elements, state.selectedIds, state.documentName, selectedOnly, state.settings.exportPadding);
  },

  saveAsPng: (selectedOnly: boolean = false) => {
    const state = get() as CanvasStore;
    exportSelection('png', state.elements, state.selectedIds, state.documentName, selectedOnly, state.settings.exportPadding);
  },

  loadDocument: async (append: boolean = false) => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const documentData = JSON.parse(content);

            if (documentData.elements && Array.isArray(documentData.elements)) {
              const state = get() as CanvasStore;
              // Clear current selection and set new document
              if (state.clearSelection) {
                state.clearSelection();
              }
              if (append) {
                // Append elements to existing ones, generating new IDs to avoid conflicts
                const newElements = (documentData.elements as CanvasElement[]).map((element, index) => ({
                  ...element,
                  id: `element_${Date.now()}_${Math.random()}`,
                  zIndex: state.elements.length + index
                }));
                set({
                  elements: [...state.elements, ...newElements],
                  activePlugin: 'select'
                });
              } else {
                // Replace elements
                set({
                  elements: documentData.elements,
                  documentName: documentData.documentName || 'Loaded Document',
                  activePlugin: 'select'
                });
              }
              resolve();
            } else {
              reject(new Error('Invalid document format'));
            }
          } catch (_error) {
            reject(new Error('Failed to parse document'));
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  },

  // Boolean path operations - consolidated with helper function
  performPathUnion: () => {
    const state = get() as CanvasStore;
    performBooleanOperation(state, performUnionOp, 2);
  },

  performPathUnionPaperJS: () => {
    const state = get() as CanvasStore;
    performBooleanOperation(state, performPathUnionPaperJS, 2);
  },

  performPathSubtraction: () => {
    const state = get() as CanvasStore;
    performBinaryBooleanOperation(state, performPathSubtraction);
  },

  performPathIntersect: () => {
    const state = get() as CanvasStore;
    performBinaryBooleanOperation(state, performPathIntersect);
  },

  performPathExclude: () => {
    const state = get() as CanvasStore;
    performBinaryBooleanOperation(state, performPathExclude);
  },

  performPathDivide: () => {
    const state = get() as CanvasStore;
    performBinaryBooleanOperation(state, performPathDivide);
  },

  // Style eyedropper actions
  activateStyleEyedropper: () => {
    const state = get() as CanvasStore;
    // Copy style from the currently selected path
    const selectedPaths = state.elements.filter(
      el => state.selectedIds.includes(el.id) && el.type === 'path'
    ) as PathElement[];

    if (selectedPaths.length === 1) {
      const pathData = selectedPaths[0].data as PathData;
      set({
        styleEyedropper: {
          isActive: true,
          copiedStyle: {
            strokeWidth: pathData.strokeWidth,
            strokeColor: pathData.strokeColor,
            strokeOpacity: pathData.strokeOpacity,
            fillColor: pathData.fillColor,
            fillOpacity: pathData.fillOpacity,
            strokeLinecap: pathData.strokeLinecap,
            strokeLinejoin: pathData.strokeLinejoin,
            fillRule: pathData.fillRule,
            strokeDasharray: pathData.strokeDasharray,
          },
        },
      });
    }
  },

  deactivateStyleEyedropper: () => {
    set({
      styleEyedropper: {
        isActive: false,
        copiedStyle: null,
      },
    });
  },

  copyStyleFromPath: (pathId: string) => {
    const state = get() as CanvasStore;
    const element = state.elements.find(el => el.id === pathId && el.type === 'path') as PathElement | undefined;
    
    if (element) {
      const pathData = element.data as PathData;
      set((currentState) => ({
        styleEyedropper: {
          ...currentState.styleEyedropper,
          copiedStyle: {
            strokeWidth: pathData.strokeWidth,
            strokeColor: pathData.strokeColor,
            strokeOpacity: pathData.strokeOpacity,
            fillColor: pathData.fillColor,
            fillOpacity: pathData.fillOpacity,
            strokeLinecap: pathData.strokeLinecap,
            strokeLinejoin: pathData.strokeLinejoin,
            fillRule: pathData.fillRule,
            strokeDasharray: pathData.strokeDasharray,
          },
        },
      }));
    }
  },

  applyStyleToPath: (pathId: string) => {
    const state = get() as CanvasStore;
    const { copiedStyle, isActive } = state.styleEyedropper;
    
    if (isActive && copiedStyle) {
      state.updateElement(pathId, {
        data: copiedStyle,
      });
      // Deactivate after applying
      state.deactivateStyleEyedropper();
    }
  },
});
};
