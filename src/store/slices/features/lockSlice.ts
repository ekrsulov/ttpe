import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../canvasStore';
import type { CanvasElement } from '../../../types';

export interface LockSlice {
  lockElements: (ids: string[]) => void;
  unlockElements: (ids: string[]) => void;
  toggleLock: (id: string) => void;
  lockSelected: () => void;
  unlockSelected: () => void;
  lockAllElements: () => void;
  unlockAllElements: () => void;
  isElementLocked: (id: string) => boolean;
  hasLockedSelection: () => boolean;
  areAllSelectedLocked: () => boolean;
}

const updateElementLockState = (elements: CanvasElement[], ids: string[], isLocked: boolean) => {
  if (ids.length === 0) {
    return elements;
  }

  const idSet = new Set(ids);
  return elements.map((element) =>
    idSet.has(element.id) ? { ...element, isLocked } : element
  );
};

export const createLockSlice: StateCreator<CanvasStore, [], [], LockSlice> = (set, get) => ({
  lockElements: (ids) => {
    if (ids.length === 0) return;

    set((state) => ({
      elements: updateElementLockState(state.elements, ids, true),
    }));

    const store = get() as CanvasStore;
    store.clearSelectedCommands();
    store.clearSubpathSelection();
  },

  unlockElements: (ids) => {
    if (ids.length === 0) return;

    set((state) => ({
      elements: updateElementLockState(state.elements, ids, false),
    }));
  },

  toggleLock: (id) => {
    const store = get() as CanvasStore;
    const isCurrentlyLocked = store.isElementLocked(id);
    if (isCurrentlyLocked) {
      store.unlockElements([id]);
    } else {
      store.lockElements([id]);
    }
  },

  lockSelected: () => {
    const store = get() as CanvasStore;
    if (store.selectedIds.length === 0) return;
    store.lockElements(store.selectedIds);
  },

  unlockSelected: () => {
    const store = get() as CanvasStore;
    if (store.selectedIds.length === 0) return;
    store.unlockElements(store.selectedIds);
  },

  lockAllElements: () => {
    set((state) => ({
      elements: state.elements.map((element) => ({
        ...element,
        isLocked: true,
      })),
    }));

    const store = get() as CanvasStore;
    store.clearSelectedCommands();
    store.clearSubpathSelection();
  },

  unlockAllElements: () => {
    set((state) => ({
      elements: state.elements.map((element) => ({
        ...element,
        isLocked: false,
      })),
    }));
  },

  isElementLocked: (id) => {
    const store = get() as CanvasStore;
    return store.elements.some((element) => element.id === id && element.isLocked);
  },

  hasLockedSelection: () => {
    const store = get() as CanvasStore;
    if (store.selectedIds.length === 0) return false;
    return store.selectedIds.some((id) => {
      const element = store.elements.find((el) => el.id === id);
      return element?.isLocked ?? false;
    });
  },

  areAllSelectedLocked: () => {
    const store = get() as CanvasStore;
    if (store.selectedIds.length === 0) return false;
    return store.selectedIds.every((id) => {
      const element = store.elements.find((el) => el.id === id);
      return element?.isLocked ?? false;
    });
  },
});
