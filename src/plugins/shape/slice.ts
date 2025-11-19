import type { StateCreator } from 'zustand';
import type { Point } from '../../types';

export type ShapeType = 'square' | 'circle' | 'triangle' | 'rectangle' | 'line' | 'diamond' | 'heart';

export interface ShapePluginSlice {
  // State
  shape: {
    selectedShape: ShapeType;
    keepShapeMode: boolean;
    interaction: {
      isCreating: boolean;
      startPoint: Point | null;
      endPoint: Point | null;
    };
  };

  // Actions
  updateShapeState: (state: Partial<ShapePluginSlice['shape']>) => void;
  setShapeInteraction: (interaction: Partial<ShapePluginSlice['shape']['interaction']>) => void;
}

export const createShapePluginSlice: StateCreator<ShapePluginSlice, [], [], ShapePluginSlice> = (set) => ({
  shape: {
    selectedShape: 'line',
    keepShapeMode: false,
    interaction: {
      isCreating: false,
      startPoint: null,
      endPoint: null,
    },
  },
  updateShapeState: (state) => {
    set((current) => ({
      shape: { ...current.shape, ...state },
    }));
  },
  setShapeInteraction: (interaction) => {
    set((current) => ({
      shape: {
        ...current.shape,
        interaction: {
          ...current.shape.interaction,
          ...interaction,
        },
      },
    }));
  },
});