import type { StateCreator } from 'zustand';

export interface EditorPluginSlice {
  // State - consolidating relevant state from individual plugins
  editor: {
    // History state (from historyPluginSlice)
    history: {
      canUndo: boolean;
      canRedo: boolean;
      historyStack: any[];
      currentIndex: number;
    };
    
    // Transformation state (from transformationPluginSlice)
    transformation: {
      isTransforming: boolean;
      activeHandler: string | null;
      showCoordinates: boolean;
      showRulers: boolean;
    };
    
    // Zoom state (from zoomPluginSlice)
    zoom: {
      level: number;
    };
    
    // Pan state (from panPluginSlice)
    pan: {
      offsetX: number;
      offsetY: number;
    };
    
    // Delete state (minimal state needed)
    delete: Record<string, never>;
    
    // Order state (no additional state needed beyond core features)
    order: Record<string, never>;
    
    // Arrange state (no additional state needed beyond core features)
    arrange: Record<string, never>;
  };

  // Actions
  updateEditorState: <K extends keyof EditorPluginSlice['editor']>(
    section: K,
    state: Partial<EditorPluginSlice['editor'][K]>
  ) => void;
}

export const createEditorPluginSlice: StateCreator<EditorPluginSlice, [], [], EditorPluginSlice> = (set) => ({
  // Initial state
  editor: {
    history: {
      canUndo: false,
      canRedo: false,
      historyStack: [],
      currentIndex: -1,
    },
    transformation: {
      isTransforming: false,
      activeHandler: null,
      showCoordinates: true,
      showRulers: true,
    },
    zoom: {
      level: 1,
    },
    pan: {
      offsetX: 0,
      offsetY: 0,
    },
    delete: {},
    order: {},
    arrange: {},
  },

  // Actions
  updateEditorState: (section, state) => {
    set((current) => ({
      editor: {
        ...current.editor,
        [section]: { ...current.editor[section], ...state },
      },
    }));
  },
});