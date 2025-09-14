import type { StateCreator } from 'zustand';

type PluginState = {
  pan: { offsetX: number; offsetY: number };
  zoom: { level: number };
  pencil: { strokeWidth: number; strokeColor: string; opacity: number };
  text: {
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline' | 'line-through';
    opacity: number;
  };
  shape: { selectedShape: 'square' | 'circle' | 'triangle' | 'rectangle' };
  select: Record<string, never>;
  delete: Record<string, never>;
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
    pan: { offsetX: 0, offsetY: 0 },
    zoom: { level: 1 },
    pencil: { strokeWidth: 20, strokeColor: '#000000', opacity: 1 },
    text: { text: 'New Text', fontSize: 72, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', opacity: 1 },
    shape: { selectedShape: 'square' },
    select: {},
    delete: {},
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