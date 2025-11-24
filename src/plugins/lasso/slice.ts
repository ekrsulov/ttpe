import type { StateCreator } from 'zustand';

export interface LassoPluginSlice {
  lassoEnabled: boolean;
  lassoPath: Array<{ x: number; y: number }>;
  activeSelectionStrategy?: string;
  setLassoEnabled: (enabled: boolean) => void;
  setLassoPath: (path: Array<{ x: number; y: number }>) => void;
  clearLassoPath: () => void;
  setActiveSelectionStrategy: (strategyId?: string) => void;
}

export const createLassoPluginSlice: StateCreator<
  LassoPluginSlice,
  [],
  [],
  LassoPluginSlice
> = (set) => ({
  lassoEnabled: false,
  lassoPath: [],
  activeSelectionStrategy: undefined,
  setLassoEnabled: (enabled) => {
    set({ 
      lassoEnabled: enabled,
      activeSelectionStrategy: enabled ? 'lasso' : 'rectangle'
    });
  },
  setLassoPath: (path) => set({ lassoPath: path }),
  clearLassoPath: () => set({ lassoPath: [] }),
  setActiveSelectionStrategy: (strategyId) => set({ activeSelectionStrategy: strategyId }),
});
