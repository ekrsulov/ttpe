import type { StateCreator } from 'zustand';
import type { CanvasElement, PathData } from '../../types';
import type { CanvasStore } from '../canvasStore';
import { performPathUnion as performUnionOp, performPathSubtraction } from '../../utils/pathOperationsUtils';
import { commandsToString } from '../../utils/pathParserUtils';

export interface BaseSlice {
  // State
  elements: CanvasElement[];
  activePlugin: string | null;
  documentName: string;
  enableGuidelines: boolean;

  // Actions
  addElement: (element: Omit<CanvasElement, 'id' | 'zIndex'>) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  deleteSelectedElements: () => void;
  setActivePlugin: (plugin: string | null) => void;
  setMode: (mode: string) => void;
  setDocumentName: (name: string) => void;
  setEnableGuidelines: (enabled: boolean) => void;
  saveDocument: () => void;
  loadDocument: (append?: boolean) => Promise<void>;
  saveAsSvg: () => void;
  performPathUnion: () => void;
  performPathSubtraction: () => void;
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

export const createBaseSlice: StateCreator<BaseSlice> = (set, get, _api) => ({
  // Initial state
  elements: [],
  activePlugin: 'select',
  documentName: 'Untitled Document',
  enableGuidelines: true,

  // Actions
  addElement: (element) => {
    const id = `element_${Date.now()}_${Math.random()}`;
    const zIndex = get().elements.length;
    set((state) => ({
      elements: [...state.elements, { ...element, id, zIndex }],
    }));
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
  },

  deleteSelectedElements: () => {
    const state = get() as CanvasStore;
    state.selectedIds.forEach((id: string) => state.deleteElement(id));
    state.clearSelection();
  },

  setActivePlugin: (plugin) => {
    set({ activePlugin: plugin });
  },

  setMode: (mode) => {
    const current = get().activePlugin;
    const rule = modeRules[mode] || { canToggleOff: false };

    if (current === mode) {
      if (rule.canToggleOff) {
        // Apagar, pero pasar al fallback o al mismo
        const fallback = rule.defaultFallback || mode;
        set({ activePlugin: fallback });
      }
      // Para modos que no se pueden apagar, no hacer nada
    } else {
      set({ activePlugin: mode });
    }
  },

  setDocumentName: (name) => {
    set({ documentName: name });
  },

  setEnableGuidelines: (enabled) => {
    set({ enableGuidelines: enabled });
  },

  saveDocument: () => {
    const state = get() as CanvasStore;
    const documentData = {
      documentName: state.documentName,
      elements: state.elements,
      viewport: state.viewport,
      enableGuidelines: state.enableGuidelines,
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

  saveAsSvg: () => {
    const state = get() as CanvasStore;
    
    // Calculate bounds of all elements
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    state.elements.forEach(element => {
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
    
    // Add some padding
    const padding = 20;
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
    state.elements.forEach(element => {
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
        svgContent += `vector-effect="non-scaling-stroke" />\n`;
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
                  enableGuidelines: documentData.enableGuidelines !== undefined ? documentData.enableGuidelines : true,
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

  performPathUnion: () => {
    const state = get() as CanvasStore;
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

    const allPaths = [...selectedPaths, ...subpathPaths];

    if (allPaths.length < 2) return;

    const result = performUnionOp(allPaths);
    if (result) {
      // Replace the first selected element with the result
      const firstSelectedId = state.selectedIds[0] || selectedSubpathElements[0]?.element.id;
      if (firstSelectedId) {
        state.updateElement(firstSelectedId, { data: result });
        
        // Remove other selected elements
        const idsToRemove = [
          ...state.selectedIds.filter(id => id !== firstSelectedId),
          ...selectedSubpathElements.slice(1).map(se => se.element.id)
        ].filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates
        
        idsToRemove.forEach(id => {
          state.deleteElement(id);
        });
      }
    }
    // If result is null, do nothing (operation not supported for these paths)
  },

  performPathSubtraction: () => {
    const state = get() as CanvasStore;
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

    const allPaths = [...selectedPaths, ...subpathPaths];

    if (allPaths.length !== 2) return;

    const result = performPathSubtraction(allPaths[0], allPaths[1]);
    if (result) {
      // Replace the first selected element with the result
      const firstSelectedId = state.selectedIds[0] || selectedSubpathElements[0]?.element.id;
      if (firstSelectedId) {
        state.updateElement(firstSelectedId, { data: result });
        
        // Remove the second selected element
        const secondSelectedId = state.selectedIds[1] || selectedSubpathElements[1]?.element.id;
        if (secondSelectedId && secondSelectedId !== firstSelectedId) {
          state.deleteElement(secondSelectedId);
        }
      }
    }
  },
});
