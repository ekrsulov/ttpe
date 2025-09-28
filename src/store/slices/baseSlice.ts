import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../types';
import type { CanvasStore } from '../canvasStore';

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
  loadDocument: () => Promise<void>;
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

  loadDocument: async () => {
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
              set({
                elements: documentData.elements,
                documentName: documentData.documentName || 'Loaded Document',
                enableGuidelines: documentData.enableGuidelines !== undefined ? documentData.enableGuidelines : true,
                activePlugin: 'select'
              });
              resolve();
            } else {
              reject(new Error('Invalid document format'));
            }
          } catch (error) {
            reject(new Error('Failed to parse document'));
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  },
});
