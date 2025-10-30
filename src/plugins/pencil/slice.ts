import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../store/utils/pluginSliceHelpers';

export interface PencilPluginSlice {
  // State
  pencil: {
    strokeWidth: number;
    strokeColor: string;
    strokeOpacity: number;
    fillColor: string;
    fillOpacity: number;
    strokeLinecap: 'butt' | 'round' | 'square';
    strokeLinejoin: 'miter' | 'round' | 'bevel';
    fillRule: 'nonzero' | 'evenodd';
    strokeDasharray: string;
    reusePath: boolean;
    simplificationTolerance: number;
  };

  // Actions
  updatePencilState: (state: Partial<PencilPluginSlice['pencil']>) => void;
}

export const createPencilPluginSlice: StateCreator<PencilPluginSlice, [], [], PencilPluginSlice> = 
  createSimplePluginSlice<'pencil', PencilPluginSlice['pencil'], PencilPluginSlice>(
    'pencil',
    {
      strokeWidth: 4,
      strokeColor: '#000000',
      strokeOpacity: 1,
      fillColor: 'none',
      fillOpacity: 1,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      fillRule: 'nonzero',
      strokeDasharray: 'none',
      reusePath: false,
      simplificationTolerance: 0,
    }
  );