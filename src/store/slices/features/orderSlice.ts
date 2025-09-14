import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';

export interface OrderSlice {
  // Actions
  bringToFront: () => void;
  sendForward: () => void;
  sendBackward: () => void;
  sendToBack: () => void;
}

type OrderState = {
  elements: CanvasElement[];
  selectedIds: string[];
};

export const createOrderSlice: StateCreator<OrderSlice> = (set, get, _api) => ({
  // Actions
  bringToFront: () => {
    const selectedIds = (get() as any).selectedIds;
    if (selectedIds.length === 0) return;

    const maxZIndex = Math.max(...(get() as any).elements.map((el: CanvasElement) => el.zIndex));
    (set as any)((state: any) => ({
      elements: state.elements.map((el: CanvasElement, index: number) => {
        if (selectedIds.includes(el.id)) {
          return { ...el, zIndex: maxZIndex + index + 1 };
        }
        return el;
      }),
    }));
  },

  sendForward: () => {
    const selectedIds = (get() as any).selectedIds;
    if (selectedIds.length === 0) return;

    (set as any)((state: any) => {
      const elements = [...state.elements].sort((a: CanvasElement, b: CanvasElement) => a.zIndex - b.zIndex);
      const newElements = [...elements];

      selectedIds.forEach((selectedId: string) => {
        const currentIndex = (newElements as any).findIndex((el: CanvasElement) => el.id === selectedId);
        if (currentIndex < newElements.length - 1) {
          // Swap with next element
          const temp = newElements[currentIndex];
          newElements[currentIndex] = newElements[currentIndex + 1];
          newElements[currentIndex + 1] = temp;
        }
      });

      return { elements: newElements };
    });
  },

  sendBackward: () => {
    const selectedIds = (get() as any).selectedIds;
    if (selectedIds.length === 0) return;

    (set as any)((state: any) => {
      const elements = [...state.elements].sort((a: CanvasElement, b: CanvasElement) => a.zIndex - b.zIndex);
      const newElements = [...elements];

      selectedIds.forEach((selectedId: string) => {
        const currentIndex = (newElements as any).findIndex((el: CanvasElement) => el.id === selectedId);
        if (currentIndex > 0) {
          // Swap with previous element
          const temp = newElements[currentIndex];
          newElements[currentIndex] = newElements[currentIndex - 1];
          newElements[currentIndex - 1] = temp;
        }
      });

      return { elements: newElements };
    });
  },

  sendToBack: () => {
    const selectedIds = (get() as any).selectedIds;
    if (selectedIds.length === 0) return;

    const minZIndex = Math.min(...(get() as any).elements.map((el: CanvasElement) => el.zIndex));
    (set as any)((state: any) => ({
      elements: state.elements.map((el: CanvasElement, index: number) => {
        if (selectedIds.includes(el.id)) {
          return { ...el, zIndex: minZIndex - index - 1 };
        }
        return el;
      }),
    }));
  },
});