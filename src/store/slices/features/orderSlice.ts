import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';

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
    const selectedIds = (get() as any).selectedIds;
    if (selectedIds.length === 0) return;

    (set as any)((state: any) => {
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