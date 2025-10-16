import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';
import type { CanvasStore } from '../../canvasStore';

export interface OrderSlice {
  // Actions
  bringToFront: () => void;
  sendForward: () => void;
  sendBackward: () => void;
  sendToBack: () => void;
}

export const createOrderSlice: StateCreator<OrderSlice> = (set, get, _api) => ({
  // Actions
  bringToFront: () => {
    const store = get() as CanvasStore;
    const selectedIds = store.selectedIds.filter((id) => {
      const element = store.elements.find((el) => el.id === id);
      return element && !element.isLocked;
    });
    if (selectedIds.length === 0) return;

    const maxZIndex = Math.max(...store.elements.map((el: CanvasElement) => el.zIndex));
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => ({
      elements: state.elements.map((el: CanvasElement, index: number) => {
        if (selectedIds.includes(el.id)) {
          return { ...el, zIndex: maxZIndex + index + 1 };
        }
        return el;
      }),
    }));
  },

  sendForward: () => {
    const store = get() as CanvasStore;
    const selectedIds = store.selectedIds.filter((id) => {
      const element = store.elements.find((el) => el.id === id);
      return element && !element.isLocked;
    });
    if (selectedIds.length === 0) return;

    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => {
      const elements = [...state.elements];

      selectedIds.forEach((selectedId: string) => {
        const currentElement = elements.find((el: CanvasElement) => el.id === selectedId);
        if (!currentElement) return;

        // Find the element immediately above (higher z-index)
        const elementsAbove = elements
          .filter((el: CanvasElement) => el.zIndex > currentElement.zIndex)
          .sort((a: CanvasElement, b: CanvasElement) => a.zIndex - b.zIndex);

        if (elementsAbove.length > 0) {
          const nextElement = elementsAbove[0];

          // Swap z-index values
          const tempZIndex = currentElement.zIndex;
          currentElement.zIndex = nextElement.zIndex;
          nextElement.zIndex = tempZIndex;
        }
      });

      return { elements };
    });
  },

  sendBackward: () => {
    const store = get() as CanvasStore;
    const selectedIds = store.selectedIds.filter((id) => {
      const element = store.elements.find((el) => el.id === id);
      return element && !element.isLocked;
    });
    if (selectedIds.length === 0) return;

    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => {
      const elements = [...state.elements];

      selectedIds.forEach((selectedId: string) => {
        const currentElement = elements.find((el: CanvasElement) => el.id === selectedId);
        if (!currentElement) return;

        // Find the element immediately below (lower z-index)
        const elementsBelow = elements
          .filter((el: CanvasElement) => el.zIndex < currentElement.zIndex)
          .sort((a: CanvasElement, b: CanvasElement) => b.zIndex - a.zIndex);

        if (elementsBelow.length > 0) {
          const prevElement = elementsBelow[0];

          // Swap z-index values
          const tempZIndex = currentElement.zIndex;
          currentElement.zIndex = prevElement.zIndex;
          prevElement.zIndex = tempZIndex;
        }
      });

      return { elements };
    });
  },

  sendToBack: () => {
    const store = get() as CanvasStore;
    const selectedIds = store.selectedIds.filter((id) => {
      const element = store.elements.find((el) => el.id === id);
      return element && !element.isLocked;
    });
    if (selectedIds.length === 0) return;

    const minZIndex = Math.min(...store.elements.map((el: CanvasElement) => el.zIndex));
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => ({
      elements: state.elements.map((el: CanvasElement, index: number) => {
        if (selectedIds.includes(el.id)) {
          return { ...el, zIndex: minZIndex - index - 1 };
        }
        return el;
      }),
    }));
  },
});