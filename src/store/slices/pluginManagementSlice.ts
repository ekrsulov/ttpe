import type { StateCreator } from 'zustand';

type PluginState = {
  // Keep non-editor plugins
  pencil: { strokeWidth: number; strokeColor: string; opacity: number };
  text: {
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    opacity: number;
  };
  shape: { selectedShape: 'square' | 'circle' | 'triangle' | 'rectangle' };
  select: Record<string, never>;
  
  // Consolidated editor plugin state
  editor: {
    history: { canUndo: boolean; canRedo: boolean; historyStack: any[]; currentIndex: number };
    transformation: {
      isTransforming: boolean;
      activeHandler: string | null;
      scaleX: number;
      scaleY: number;
      rotation: number;
      transformOrigin: { x: number; y: number } | null;
      showCoordinates: boolean;
      showRulers: boolean;
    };
    zoom: { level: number };
    pan: { offsetX: number; offsetY: number };
    delete: Record<string, never>;
    order: Record<string, never>;
    arrange: Record<string, never>;
  };
  
  // Keep transformation plugin for backward compatibility until fully migrated
  transformation: {
    isTransforming: boolean;
    activeHandler: string | null;
    scaleX: number;
    scaleY: number;
    rotation: number;
    transformOrigin: { x: number; y: number } | null;
    showCoordinates: boolean;
    showRulers: boolean;
  };
};

export interface PluginManagementSlice {
  // State
  plugins: PluginState;

  // Actions
  updatePluginState: <K extends keyof PluginState>(
    plugin: K,
    state: Partial<PluginState[K]>
  ) => void;
}

export const createPluginManagementSlice: StateCreator<PluginManagementSlice> = (set, _get, _api) => ({
  // Initial state
  plugins: {
    pencil: { strokeWidth: 20, strokeColor: '#000000', opacity: 1 },
    text: { text: 'New Text', fontSize: 72, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', opacity: 1 },
    shape: { selectedShape: 'square' },
    select: {},
    editor: {
      history: { canUndo: false, canRedo: false, historyStack: [], currentIndex: -1 },
      transformation: {
        isTransforming: false,
        activeHandler: null,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        transformOrigin: null,
        showCoordinates: true,
        showRulers: true,
      },
      zoom: { level: 1 },
      pan: { offsetX: 0, offsetY: 0 },
      delete: {},
      order: {},
      arrange: {},
    },
    // Keep transformation for backward compatibility
    transformation: {
      isTransforming: false,
      activeHandler: null,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      transformOrigin: null,
      showCoordinates: true,
      showRulers: true,
    },
  },

  // Actions
  updatePluginState: (plugin, state) => {
    set((current) => ({
      plugins: {
        ...current.plugins,
        [plugin]: { ...current.plugins[plugin], ...state },
      },
    }));
  },
});