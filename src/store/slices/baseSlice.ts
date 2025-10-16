import type { StateCreator } from 'zustand';
import type { CanvasElement, PathData } from '../../types';
import type { CanvasStore } from '../canvasStore';
import { performPathUnion as performUnionOp, performPathSubtraction, performPathUnionPaperJS, performPathIntersect, performPathExclude, performPathDivide, commandsToString } from '../../utils/path';

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
  addElement: (element: Omit<CanvasElement, 'id' | 'zIndex'> & { isLocked?: boolean }) => string;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
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

// Helper to get selected paths for boolean operations
const getSelectedPaths = (state: CanvasStore): PathData[] => {
  const selectedPaths = state.elements.filter(el =>
    state.selectedIds.includes(el.id) && el.type === 'path'
  ).map(el => el.data as PathData);

  const selectedSubpathElements = state.selectedSubpaths.map(sp => {
    const element = state.elements.find(el => el.id === sp.elementId);
    if (element && element.type === 'path') {
      return { element, subpathIndex: sp.subpathIndex };
    }
    return null;
  }).filter(Boolean) as Array<{ element: CanvasElement; subpathIndex: number }>;

  // Handle selected subpaths by extracting them as separate paths
  const subpathPaths = selectedSubpathElements.map(({ element, subpathIndex }) => {
    const pathData = element.data as PathData;
    return {
      ...pathData,
      subPaths: [pathData.subPaths[subpathIndex]]
    };
  });

  return [...selectedPaths, ...subpathPaths];
};

// Generic handler for boolean path operations
const performBooleanOperation = (
  state: CanvasStore,
  operation: (paths: PathData[]) => PathData | null,
  minPaths: number = 2
) => {
  const allPaths = getSelectedPaths(state);

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
  const allPaths = getSelectedPaths(state);

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
    const zIndex = get().elements.length;
    set((state) => ({
      elements: [
        ...state.elements,
        {
          ...element,
          id,
          zIndex,
          isLocked: element.isLocked ?? false,
        },
      ],
    }));
    return id;
  },

  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map((element) =>
        element.id === id ? { ...element, ...updates } : element
      ),
    }));
  },

  deleteElement: (id) => {
    set((state) => ({
      elements: state.elements.filter((element) => element.id !== id),
    }));
    // Clear guidelines when an element is deleted to avoid inconsistencies
    const state = get() as CanvasStore;
    if (state.clearGuidelines) {
      state.clearGuidelines();
    }
  },

  deleteSelectedElements: () => {
    const state = get() as CanvasStore;
    const deletableIds = state.selectedIds.filter((id: string) => {
      const element = state.elements.find((el) => el.id === id);
      return element && !element.isLocked;
    });

    if (deletableIds.length === 0) {
      state.clearSelection();
      return;
    }

    deletableIds.forEach((id: string) => state.deleteElement(id));
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
    
    // Filter elements based on selection if needed
    const elementsToExport = selectedOnly
      ? state.elements.filter(el => state.selectedIds.includes(el.id))
      : state.elements;

    if (elementsToExport.length === 0) {
      console.warn('No elements to export');
      return;
    }
    
    // Calculate bounds of elements to export
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    elementsToExport.forEach(element => {
      if (element.type === 'path') {
        const pathData = element.data as PathData;
        pathData.subPaths.forEach(subPath => {
          subPath.forEach(command => {
            if (command.type === 'M' || command.type === 'L') {
              minX = Math.min(minX, command.position.x);
              minY = Math.min(minY, command.position.y);
              maxX = Math.max(maxX, command.position.x);
              maxY = Math.max(maxY, command.position.y);
            } else if (command.type === 'C') {
              minX = Math.min(minX, command.position.x, command.controlPoint1.x, command.controlPoint2.x);
              minY = Math.min(minY, command.position.y, command.controlPoint1.y, command.controlPoint2.y);
              maxX = Math.max(maxX, command.position.x, command.controlPoint1.x, command.controlPoint2.x);
              maxY = Math.max(maxY, command.position.y, command.controlPoint1.y, command.controlPoint2.y);
            }
          });
        });
      }
    });
    
    // Add padding only when exporting all elements (not selected only)
    const padding = selectedOnly ? 0 : 20;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Create SVG content
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svgContent += `<svg width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    
    // Add elements
    elementsToExport.forEach(element => {
      if (element.type === 'path') {
        const pathData = element.data as PathData;
        const pathD = commandsToString(pathData.subPaths.flat());
        
        // For pencil paths, if strokeColor is 'none', render with black
        const effectiveStrokeColor = pathData.isPencilPath && pathData.strokeColor === 'none'
          ? '#000000'
          : pathData.strokeColor;
        
        svgContent += `  <path d="${pathD}" `;
        svgContent += `stroke="${effectiveStrokeColor}" `;
        svgContent += `stroke-width="${pathData.strokeWidth}" `;
        svgContent += `fill="${pathData.fillColor}" `;
        svgContent += `fill-opacity="${pathData.fillOpacity}" `;
        svgContent += `stroke-opacity="${pathData.strokeOpacity}" `;
        if (pathData.strokeLinecap) {
          svgContent += `stroke-linecap="${pathData.strokeLinecap}" `;
        }
        if (pathData.strokeLinejoin) {
          svgContent += `stroke-linejoin="${pathData.strokeLinejoin}" `;
        }
        if (pathData.fillRule) {
          svgContent += `fill-rule="${pathData.fillRule}" `;
        }
        if (pathData.strokeDasharray && pathData.strokeDasharray !== 'none') {
          svgContent += `stroke-dasharray="${pathData.strokeDasharray}" `;
        }
        svgContent += `/>\n`;
      }
    });
    
    svgContent += `</svg>`;
    
    // Create blob and download
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

    // Calculate bounds of all elements to export
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Filter elements based on selection if needed
    const elementsToExport = selectedOnly
      ? state.elements.filter(el => state.selectedIds.includes(el.id))
      : state.elements;

    if (elementsToExport.length === 0) {
      console.warn('No elements to export');
      return;
    }

    // Calculate bounds from element data
    elementsToExport.forEach(element => {
      if (element.type === 'path') {
        const pathData = element.data as PathData;
        pathData.subPaths.forEach(subPath => {
          subPath.forEach(command => {
            if (command.type === 'M' || command.type === 'L') {
              minX = Math.min(minX, command.position.x);
              minY = Math.min(minY, command.position.y);
              maxX = Math.max(maxX, command.position.x);
              maxY = Math.max(maxY, command.position.y);
            } else if (command.type === 'C') {
              minX = Math.min(minX, command.position.x, command.controlPoint1.x, command.controlPoint2.x);
              minY = Math.min(minY, command.position.y, command.controlPoint1.y, command.controlPoint2.y);
              maxX = Math.max(maxX, command.position.x, command.controlPoint1.x, command.controlPoint2.x);
              maxY = Math.max(maxY, command.position.y, command.controlPoint1.y, command.controlPoint2.y);
            }
          });
        });
      }
    });

    const padding = selectedOnly ? 0 : 20;
    const width = Math.max(maxX - minX + (padding * 2), 100);
    const height = Math.max(maxY - minY + (padding * 2), 100);

    // Create SVG content manually
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svgContent += `<svg width="${width}" height="${height}" viewBox="${minX - padding} ${minY - padding} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n`;

    // Add elements
    elementsToExport.forEach(element => {
      if (element.type === 'path') {
        const pathData = element.data as PathData;
        const pathD = commandsToString(pathData.subPaths.flat());

        // For pencil paths, if strokeColor is 'none', render with black
        const effectiveStrokeColor = pathData.isPencilPath && pathData.strokeColor === 'none'
          ? '#000000'
          : pathData.strokeColor;

        svgContent += `  <path d="${pathD}" `;
        svgContent += `stroke="${effectiveStrokeColor}" `;
        svgContent += `stroke-width="${pathData.strokeWidth}" `;
        svgContent += `fill="${pathData.fillColor}" `;
        svgContent += `fill-opacity="${pathData.fillOpacity}" `;
        svgContent += `stroke-opacity="${pathData.strokeOpacity}" `;
        if (pathData.strokeLinecap) {
          svgContent += `stroke-linecap="${pathData.strokeLinecap}" `;
        }
        if (pathData.strokeLinejoin) {
          svgContent += `stroke-linejoin="${pathData.strokeLinejoin}" `;
        }
        if (pathData.fillRule) {
          svgContent += `fill-rule="${pathData.fillRule}" `;
        }
        if (pathData.strokeDasharray && pathData.strokeDasharray !== 'none') {
          svgContent += `stroke-dasharray="${pathData.strokeDasharray}" `;
        }
        svgContent += `/>\n`;
      }
    });

    svgContent += `</svg>`;

    // Convert SVG to data URL
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;

    // Create canvas and draw SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    canvas.width = width;
    canvas.height = height;

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
