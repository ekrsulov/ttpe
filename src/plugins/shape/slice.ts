import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../store/utils/pluginSliceHelpers';

export type ShapeType = 'square' | 'circle' | 'triangle' | 'rectangle' | 'line' | 'diamond' | 'heart';

export interface ShapePluginSlice {
  // State
  shape: {
    selectedShape: ShapeType;
    keepShapeMode: boolean;
  };

  // Actions
  updateShapeState: (state: Partial<ShapePluginSlice['shape']>) => void;
}

export const createShapePluginSlice: StateCreator<ShapePluginSlice, [], [], ShapePluginSlice> = 
  createSimplePluginSlice<'shape', ShapePluginSlice['shape'], ShapePluginSlice>(
    'shape',
    {
      selectedShape: 'line',
      keepShapeMode: false,
    }
  );