import type { StateCreator } from 'zustand';

export interface TextPluginSlice {
  // State
  text: {
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline' | 'line-through';
    opacity: number;
  };
}

export const createTextPluginSlice: StateCreator<TextPluginSlice, [], [], TextPluginSlice> = () => ({
  // Initial state
  text: {
    text: 'New Text',
    fontSize: 72,
    fontFamily: 'Arial',
    color: '#000000',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    opacity: 1,
  },
});