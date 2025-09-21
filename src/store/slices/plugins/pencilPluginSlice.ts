import type { StateCreator } from 'zustand';

export interface PencilPluginSlice {
  // State
  pencil: {
    strokeWidth: number;
    strokeColor: string;
    strokeOpacity: number;
    fillColor: string;
    fillOpacity: number;
    reusePath: boolean;
  };

  // Actions
  updatePencilState: (state: Partial<PencilPluginSlice['pencil']>) => void;
}

export const createPencilPluginSlice: StateCreator<PencilPluginSlice, [], [], PencilPluginSlice> = (set) => ({
  // Initial state
  pencil: {
    strokeWidth: 4,
    strokeColor: '#000000',
    strokeOpacity: 1,
    fillColor: 'none',
    fillOpacity: 1,
    reusePath: false,
  },

  // Actions
  updatePencilState: (state) => {
    set((current) => ({
      pencil: { ...current.pencil, ...state },
    }));
  },
});