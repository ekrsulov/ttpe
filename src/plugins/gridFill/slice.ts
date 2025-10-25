import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../store/utils/pluginSliceHelpers';

export interface GridFillPluginSlice {
  // State
  gridFill: {
    fillColor: string;
    fillOpacity: number;
  };

  // Actions
  updateGridFillState: (state: Partial<GridFillPluginSlice['gridFill']>) => void;
}

export const createGridFillPluginSlice: StateCreator<GridFillPluginSlice, [], [], GridFillPluginSlice> = 
  createSimplePluginSlice<'gridFill', GridFillPluginSlice['gridFill'], GridFillPluginSlice>(
    'gridFill',
    {
      fillColor: '#4299e1',
      fillOpacity: 0.5,
    }
  );
