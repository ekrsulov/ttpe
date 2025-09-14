import type { StateCreator } from 'zustand';

export interface PencilPluginSlice {
  // State
  pencil: {
    strokeWidth: number;
    strokeColor: string;
    opacity: number;
  };
}

export const createPencilPluginSlice: StateCreator<PencilPluginSlice, [], [], PencilPluginSlice> = () => ({
  // Initial state
  pencil: {
    strokeWidth: 20,
    strokeColor: '#000000',
    opacity: 1,
  },
});