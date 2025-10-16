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
    const selectedIds = store.selectedIds;
    if (selectedIds.length === 0) return;

    const rootElements = store.elements.filter((el: CanvasElement) => !el.parentId);
    const maxZIndex = rootElements.length > 0
      ? Math.max(...rootElements.map((el: CanvasElement) => el.zIndex))
      : 0;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => ({
      elements: state.elements.map((el: CanvasElement, index: number) => {
        if (selectedIds.includes(el.id) && !el.parentId) {
          return { ...el, zIndex: maxZIndex + index + 1 };
        }
        return el;
      }),
    }));
  },

  sendForward: () => {
    const store = get() as CanvasStore;
    const selectedIds = store.selectedIds;
    if (selectedIds.length === 0) return;

    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => {
      const elements = [...state.elements];

      selectedIds.forEach((selectedId: string) => {
        const currentElement = elements.find((el: CanvasElement) => el.id === selectedId);
        if (!currentElement || currentElement.parentId) return;

        // Find the element immediately above (higher z-index)
        const elementsAbove = elements
          .filter((el: CanvasElement) => !el.parentId && el.zIndex > currentElement.zIndex)
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
    const selectedIds = store.selectedIds;
    if (selectedIds.length === 0) return;

    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => {
      const elements = [...state.elements];

      selectedIds.forEach((selectedId: string) => {
        const currentElement = elements.find((el: CanvasElement) => el.id === selectedId);
        if (!currentElement || currentElement.parentId) return;

        // Find the element immediately below (lower z-index)
        const elementsBelow = elements
          .filter((el: CanvasElement) => !el.parentId && el.zIndex < currentElement.zIndex)
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
    const selectedIds = store.selectedIds;
    if (selectedIds.length === 0) return;

    const rootElements = store.elements.filter((el: CanvasElement) => !el.parentId);
    const minZIndex = rootElements.length > 0
      ? Math.min(...rootElements.map((el: CanvasElement) => el.zIndex))
      : 0;
    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => ({
      elements: state.elements.map((el: CanvasElement, index: number) => {
        if (selectedIds.includes(el.id) && !el.parentId) {
          return { ...el, zIndex: minZIndex - index - 1 };
        }
        return el;
      }),
    }));
  },
});