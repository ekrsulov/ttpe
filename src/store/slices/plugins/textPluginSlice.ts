import type { StateCreator } from 'zustand';

export interface TextPluginSlice {
  // State
  text: {
    text: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
  };

  // Actions
  updateTextState: (state: Partial<TextPluginSlice['text']>) => void;
}

export const createTextPluginSlice: StateCreator<TextPluginSlice, [], [], TextPluginSlice> = (set) => ({
  // Initial state
  text: {
    text: 'New Text',
    fontSize: 72,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
  },

  // Actions
  updateTextState: (state) => {
    set((current) => ({
      text: { ...current.text, ...state },
    }));
  },
});