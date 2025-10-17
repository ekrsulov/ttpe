import type { StateCreator } from 'zustand';
import type { CanvasElement, GroupElement, PathData, PathElement } from '../../types';
import type { CanvasStore } from '../canvasStore';
import { performPathUnion as performUnionOp, performPathSubtraction, performPathUnionPaperJS, performPathIntersect, performPathExclude, performPathDivide } from '../../utils/path';
// Removed unused imports: commandsToString, measurePath (now in exportUtils), getSelectedSubpathElements (not used in this file)
import { getSelectedPaths } from '../utils/pluginSliceHelpers';
import { serializePathsForExport } from '../../utils/exportUtils';

export interface BaseSlice {
  // State
  elements: CanvasElement[];
  activePlugin: string | null;
  documentName: string;
  showFilePanel: boolean;
  showSettingsPanel: boolean;
  isVirtualShiftActive: boolean; // Virtual shift mode for mobile/touch devices
  
  // Settings
  settings: {
    keyboardMovementPrecision: number; // Number of decimal places for keyboard movement (0 = integers)
    showRenderCountBadges: boolean; // Show debug render count badges
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
}

type ModeRule = {
  canToggleOff: boolean;
  defaultFallback?: string;
};

const modeRules: Record<string, ModeRule> = {
  select: { canToggleOff: false },
  pan: { canToggleOff: false },
  pencil: { canToggleOff: false },
  text: { canToggleOff: false },
  shape: { canToggleOff: false },
  transformation: { canToggleOff: true, defaultFallback: 'select' },
  edit: { canToggleOff: true, defaultFallback: 'select' },
  subpath: { canToggleOff: true, defaultFallback: 'select' },
};

// Generic handler for boolean path operations
const performBooleanOperation = (
  state: CanvasStore,
  operation: (paths: PathData[]) => PathData | null,
  minPaths: number = 2
) => {
  const allPaths = getSelectedPaths(state.elements, state.selectedIds, state.selectedSubpaths);

  if (allPaths.length < minPaths) return;

  const result = operation(allPaths);
  if (result) {
    // Replace the first selected element with the result
    const firstSelectedId = state.selectedIds[0] || state.selectedSubpaths[0]?.elementId;
    if (firstSelectedId) {
      state.updateElement(firstSelectedId, { data: result });
      
      // Remove other selected elements
      const idsToRemove = [
        ...state.selectedIds.filter(id => id !== firstSelectedId),
        ...state.selectedSubpaths.slice(1).map(sp => sp.elementId)
      ].filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates
      
      idsToRemove.forEach(id => {
        state.deleteElement(id);
      });
    }
  }
  // If result is null, do nothing (operation not supported for these paths)

  // Clear selection after operation
  state.clearSelection();
  state.clearSubpathSelection();
};

// Generic handler for binary boolean path operations
const performBinaryBooleanOperation = (
  state: CanvasStore,
  operation: (path1: PathData, path2: PathData) => PathData | null
) => {
  const allPaths = getSelectedPaths(state.elements, state.selectedIds, state.selectedSubpaths);

  if (allPaths.length !== 2) return;

  const result = operation(allPaths[0], allPaths[1]);
  if (result) {
    // Replace the first selected element with the result
    const firstSelectedId = state.selectedIds[0] || state.selectedSubpaths[0]?.elementId;
    if (firstSelectedId) {
      state.updateElement(firstSelectedId, { data: result });
      
      // Remove the second selected element
      const secondSelectedId = state.selectedIds[1] || state.selectedSubpaths[1]?.elementId;
      if (secondSelectedId && secondSelectedId !== firstSelectedId) {
        state.deleteElement(secondSelectedId);
      }
    }
  }

  // Clear selection after operation
  state.clearSelection();
  state.clearSubpathSelection();
};

export const createBaseSlice: StateCreator<BaseSlice> = (set, get, _api) => ({
  // Initial state
  elements: [],
  activePlugin: 'select',
  documentName: 'Untitled Document',
  showFilePanel: false,
  showSettingsPanel: false,
  isVirtualShiftActive: false,
  
  // Settings with defaults
  settings: {
    keyboardMovementPrecision: 0, // Default to 0 (integers only)
    showRenderCountBadges: false, // Show badges in development by default
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
      let updatedElements = currentState.elements.filter((element) => element.id !== id);

      if (elementToDelete.type === 'group') {
        const groupData = elementToDelete.data;

        // Reparent children to the group's parent
        updatedElements = updatedElements.map((element) => {
          if (groupData.childIds.includes(element.id)) {
            return { ...element, parentId };
          }
          return element;
        });

        // If the group had a parent, replace the group entry with its children
        if (parentId) {
          updatedElements = updatedElements.map((element) => {
            if (element.id === parentId && element.type === 'group') {
              const parentData = element.data;
              const newChildIds: string[] = [];
              parentData.childIds.forEach((childId) => {
                if (childId === id) {
                  newChildIds.push(...groupData.childIds);
                } else {
                  newChildIds.push(childId);
                }
              });
              return {
                ...element,
                data: {
                  ...parentData,
                  childIds: newChildIds,
                },
              };
            }
            return element;
          });
        }
      } else if (parentId) {
        // Remove the element reference from its parent group
        updatedElements = updatedElements.map((element) => {
          if (element.id === parentId && element.type === 'group') {
            const parentData = element.data;
            return {
              ...element,
              data: {
                ...parentData,
                childIds: parentData.childIds.filter((childId) => childId !== id),
              },
            };
          }
          return element;
        });
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
    set({ activePlugin: plugin });
    // When switching to select mode, clear any subpath selections
    if (plugin === 'select') {
      const state = get() as CanvasStore;
      if (state.clearSubpathSelection) {
        state.clearSubpathSelection();
      }
    }
    // Clear guidelines when changing modes to avoid showing stale guidelines
    const state = get() as CanvasStore;
    if (state.clearGuidelines) {
      state.clearGuidelines();
    }
  },

  setMode: (mode) => {
    const current = get().activePlugin;
    const rule = modeRules[mode] || { canToggleOff: false };

    if (current === mode) {
      if (rule.canToggleOff) {
        // Apagar, pero pasar al fallback o al mismo
        const fallback = rule.defaultFallback || mode;
        set({ activePlugin: fallback });
        // When switching to select mode, clear any subpath selections
        if (fallback === 'select') {
          const state = get() as CanvasStore;
          if (state.clearSubpathSelection) {
            state.clearSubpathSelection();
          }
        }
      }
      // Para modos que no se pueden apagar, no hacer nada
    } else {
      set({ activePlugin: mode });
      // When switching to select mode, clear any subpath selections
      if (mode === 'select') {
        const state = get() as CanvasStore;
        if (state.clearSubpathSelection) {
          state.clearSubpathSelection();
        }
      }
    }
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

    if (state.elements.length === 0) {
      console.warn('No elements to export');
      return;
    }

    // Use centralized serialization helper
    const result = serializePathsForExport(
      state.elements,
      state.selectedIds,
      { selectedOnly, padding: selectedOnly ? 0 : 20 }
    );

    if (!result) {
      return;
    }

    const { svgContent } = result;

    const dataBlob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.documentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

    saveAsPng: (selectedOnly: boolean = false) => {
    const state = get() as CanvasStore;

    if (state.elements.length === 0) {
      console.warn('No elements to export');
      return;
    }

    // Use centralized serialization helper (same as saveAsSvg)
    const result = serializePathsForExport(
      state.elements,
      state.selectedIds,
      { selectedOnly, padding: selectedOnly ? 0 : 20 }
    );

    if (!result) {
      return;
    }

    const { svgContent, bounds } = result;

    // Convert SVG to data URL
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;

    // Create canvas and draw SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    canvas.width = bounds.width;
    canvas.height = bounds.height;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);

      // Convert to PNG and download
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Could not create PNG blob');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${state.documentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.onerror = () => {
      console.error('Failed to load SVG image');
    };
    img.src = svgDataUrl;
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
});
