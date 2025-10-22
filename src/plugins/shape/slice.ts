import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../store/utils/pluginSliceHelpers';

export type ShapeType = 'square' | 'circle' | 'triangle' | 'rectangle';

export interface ShapePluginSlice {
  // State
  shape: {
    selectedShape: ShapeType;
  };

  // Actions
  updateShapeState: (state: Partial<ShapePluginSlice['shape']>) => void;
}

export const createShapePluginSlice: StateCreator<ShapePluginSlice, [], [], ShapePluginSlice> = 
  createSimplePluginSlice<'shape', ShapePluginSlice['shape'], ShapePluginSlice>(
    'shape',
    {
      selectedShape: 'square',
    }
  );