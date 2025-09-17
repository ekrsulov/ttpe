import type { StateCreator } from 'zustand';

export interface TransformationPluginSlice {
  // State
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

  // Actions
  updateTransformationState: (state: Partial<TransformationPluginSlice['transformation']>) => void;
}

export const createTransformationPluginSlice: StateCreator<TransformationPluginSlice, [], [], TransformationPluginSlice> = (set) => ({
  // Initial state
  transformation: {
    isTransforming: false,
    activeHandler: null,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    transformOrigin: null,
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