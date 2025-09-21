import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../canvasStore';
import type { PluginState } from '../../../types';

export interface StateSnapshot {
  elements: CanvasStore['elements'];
  selectedIds: CanvasStore['selectedIds'];
  viewport: CanvasStore['viewport'];
  plugins: PluginState;
  activePlugin: CanvasStore['activePlugin'];
}

export interface HistoryPluginSlice {
  // State
  history: {
    canUndo: boolean;
    canRedo: boolean;
    historyStack: StateSnapshot[];
    currentIndex: number;
  };

  // Actions
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  saveState: (state: StateSnapshot) => void;
}

export const createHistoryPluginSlice: StateCreator<HistoryPluginSlice> = (set, get) => ({
  // Initial state
  history: {
    canUndo: false,
    canRedo: false,
    historyStack: [],
    currentIndex: -1,
  },

  // Actions
  undo: () => {
    const { history } = get();
    if (history.currentIndex > 0) {
      const newIndex = history.currentIndex - 1;
      const previousState = history.historyStack[newIndex];

      set(() => ({
        ...previousState,
        history: {
          ...get().history,
          currentIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: true,
        },
      }));
    }
  },

  redo: () => {
    const { history } = get();
    if (history.currentIndex < history.historyStack.length - 1) {
      const newIndex = history.currentIndex + 1;
      const nextState = history.historyStack[newIndex];

      set(() => ({
        ...nextState,
        history: {
          ...get().history,
          currentIndex: newIndex,
          canUndo: true,
          canRedo: newIndex < history.historyStack.length - 1,
        },
      }));
    }
  },

  clearHistory: () => {
    set(() => ({
      history: {
        canUndo: false,
        canRedo: false,
        historyStack: [],
        currentIndex: -1,
      },
    }));
  },

  saveState: (newState) => {
    const currentState = get();
    const { history } = currentState;

    // Create a snapshot of the current state (excluding history)
    const stateSnapshot = {
      elements: newState.elements,
      selectedIds: newState.selectedIds,
      viewport: newState.viewport,
      plugins: newState.plugins,
      activePlugin: newState.activePlugin,
    };

    // Remove future states if we're not at the end of the stack
    const newStack = history.historyStack.slice(0, history.currentIndex + 1);
    newStack.push(stateSnapshot);

    // Limit history to 50 states
    if (newStack.length > 50) {
      newStack.shift();
    }

    const newIndex = newStack.length - 1;

    set(() => ({
      ...get(),
      history: {
        ...get().history,
        historyStack: newStack,
        currentIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: false,
      },
    }));
  },
});