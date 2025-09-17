import type { StateCreator } from 'zustand';

export interface TransformationPluginSlice {
  // State
  transformation: {
    isTransforming: boolean;
    activeHandler: string | null;
    showCoordinates: boolean;
    showRulers: boolean;
  };

  // Actions
  updateTransformationState: (state: Partial<TransformationPluginSlice['transformation']>) => void;
}

export const createTransformationPluginSlice: StateCreator<TransformationPluginSlice, [], [], TransformationPluginSlice> = (set) => ({
  // Initial state
  transformation: {
    isTransforming: false,
    activeHandler: null,
    showCoordinates: false,
    showRulers: false,
  },

  // Actions
  updateTransformationState: (state) => {
    set((current) => ({
      transformation: { ...current.transformation, ...state },
    }));
  },
});