import type { StateCreator } from 'zustand';

export interface PencilPluginSlice {
  // State
  pencil: {
    strokeWidth: number;
    strokeColor: string;
    opacity: number;
    fillColor: string;
    fillOpacity: number;
  };
}

export const createPencilPluginSlice: StateCreator<PencilPluginSlice, [], [], PencilPluginSlice> = () => ({
  // Initial state
  pencil: {
    strokeWidth: 4,
    strokeColor: '#000000',
    opacity: 1,
    fillColor: 'none',
    fillOpacity: 1,
  },
});