import type { StateCreator } from 'zustand';

export type ShapeType = 'square' | 'circle' | 'triangle' | 'rectangle';

export interface ShapePluginSlice {
  // State
  shape: {
    selectedShape: ShapeType;
  };
}

export const createShapePluginSlice: StateCreator<ShapePluginSlice, [], [], ShapePluginSlice> = () => ({
  // Initial state
  shape: {
    selectedShape: 'square',
  },
});