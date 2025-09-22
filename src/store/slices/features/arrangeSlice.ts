import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';
import type { CanvasStore } from '../../canvasStore';
import { measurePath } from '../../../utils/measurementUtils';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../../utils';
import { transformSubpathsData } from '../../../utils/transformationUtils';

// Helper interface for element bounds
interface ElementWithBounds {
  element: CanvasElement;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  centerX: number;
  width: number;
  height: number;
}

export interface ArrangeSlice {
  // Actions
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;
  alignTop: () => void;
  alignMiddle: () => void;
  alignBottom: () => void;
  distributeHorizontally: () => void;
  distributeVertically: () => void;
}

export const createArrangeSlice: StateCreator<ArrangeSlice> = (set, get, _api) => ({
  // Actions
  alignLeft: () => {
    const fullState = get() as CanvasStore;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 2) return;

    const minX = Math.min(...selectedElements.map((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.subPaths, pathData.strokeWidth, fullState.viewport.zoom);
        return bounds.minX;
      }
      return 0;
    }));

    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => ({
      elements: state.elements.map((el: CanvasElement) => {
        if (fullState.selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            const currentBounds = measurePath(pathData.subPaths, pathData.strokeWidth, fullState.viewport.zoom);
            const deltaX = formatToPrecision(minX - currentBounds.minX, PATH_DECIMAL_PRECISION);
            
            if (!isNaN(deltaX)) {
              return {
                ...el,
                data: transformSubpathsData(pathData, 1, 1, deltaX, 0, 0),
              };
            }
          }
        }
        return el;
      }),
    }));
  },

  alignCenter: () => {
    const fullState = get() as CanvasStore;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 2) return;

    const centers = new Map<string, number>();
    selectedElements.forEach((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.subPaths, pathData.strokeWidth, fullState.viewport.zoom);
        centers.set(el.id, (bounds.minX + bounds.maxX) / 2);
      }
    });

    const targetCenter = Array.from(centers.values()).reduce((sum: number, center: number) => sum + center, 0) / centers.size;

    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => ({
      elements: state.elements.map((el: CanvasElement) => {
        if (fullState.selectedIds.includes(el.id) && centers.has(el.id)) {
          const currentCenter = centers.get(el.id)!;
          const deltaX = formatToPrecision(targetCenter - currentCenter, PATH_DECIMAL_PRECISION);

          if (!isNaN(deltaX) && el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            return {
              ...el,
              data: transformSubpathsData(pathData, 1, 1, deltaX, 0, 0),
            };
          }
        }
        return el;
      }),
    }));
  },

  alignRight: () => {
    const fullState = get() as CanvasStore;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 2) return;

    const maxX = Math.max(...selectedElements.map((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.subPaths, pathData.strokeWidth, fullState.viewport.zoom);
        return bounds.maxX;
      }
      return 0;
    }));

    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => ({
      elements: state.elements.map((el: CanvasElement) => {
        if (fullState.selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            const currentBounds = measurePath(pathData.subPaths, pathData.strokeWidth, fullState.viewport.zoom);
            const deltaX = formatToPrecision(maxX - currentBounds.maxX, PATH_DECIMAL_PRECISION);
            return {
              ...el,
              data: transformSubpathsData(pathData, 1, 1, deltaX, 0, 0),
            };
          }
        }
        return el;
      }),
    }));
  },

  alignTop: () => {
    const fullState = get() as CanvasStore;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 2) return;

    const minY = Math.min(...selectedElements.map((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.subPaths, pathData.strokeWidth, fullState.viewport.zoom);
        return bounds.minY;
      }
      return 0;
    }));

    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => ({
      elements: state.elements.map((el: CanvasElement) => {
        if (fullState.selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            const currentBounds = measurePath(pathData.subPaths, pathData.strokeWidth, fullState.viewport.zoom);
            const deltaY = formatToPrecision(minY - currentBounds.minY, PATH_DECIMAL_PRECISION);
            return {
              ...el,
              data: transformSubpathsData(pathData, 1, 1, 0, deltaY, 0),
            };
          }
        }
        return el;
      }),
    }));
  },

  alignMiddle: () => {
    const fullState = get() as CanvasStore;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 2) return;

    const centers = new Map<string, number>();
    selectedElements.forEach((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.subPaths, pathData.strokeWidth, fullState.viewport.zoom);
        centers.set(el.id, (bounds.minY + bounds.maxY) / 2);
      }
    });

    const targetCenter = Array.from(centers.values()).reduce((sum: number, center: number) => sum + center, 0) / centers.size;

    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => ({
      elements: state.elements.map((el: CanvasElement) => {
        if (fullState.selectedIds.includes(el.id) && centers.has(el.id)) {
          const currentCenter = centers.get(el.id)!;
          const deltaY = formatToPrecision(targetCenter - currentCenter, PATH_DECIMAL_PRECISION);

          if (!isNaN(deltaY) && el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            return {
              ...el,
              data: transformSubpathsData(pathData, 1, 1, 0, deltaY, 0),
            };
          }
        }
        return el;
      }),
    }));
  },

  alignBottom: () => {
    const fullState = get() as CanvasStore;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 2) return;

    const maxY = Math.max(...selectedElements.map((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.subPaths, pathData.strokeWidth, fullState.viewport.zoom);
        return bounds.maxY;
      }
      return 0;
    }));

    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => ({
      elements: state.elements.map((el: CanvasElement) => {
        if (fullState.selectedIds.includes(el.id)) {
          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            const currentBounds = measurePath(pathData.subPaths, pathData.strokeWidth, fullState.viewport.zoom);
            const deltaY = formatToPrecision(maxY - currentBounds.maxY, PATH_DECIMAL_PRECISION);
            return {
              ...el,
              data: transformSubpathsData(pathData, 1, 1, 0, deltaY, 0),
            };
          }
        }
        return el;
      }),
    }));
  },

  distributeHorizontally: () => {
    const fullState = get() as CanvasStore;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 3) return;

    // Calculate bounds for all selected elements
    const elementBounds: ElementWithBounds[] = [];

    selectedElements.forEach((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.subPaths, pathData.strokeWidth, fullState.viewport.zoom);
        elementBounds.push({
          element: el,
          bounds,
          centerX: (bounds.minX + bounds.maxX) / 2,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY
        });
      }
    });

    if (elementBounds.length < 3) return;

    // Sort by current center X position
    elementBounds.sort((a: ElementWithBounds, b: ElementWithBounds) => a.centerX - b.centerX);

    // Calculate the available space between elements
    const leftmost = elementBounds[0].bounds.minX;
    const rightmost = elementBounds[elementBounds.length - 1].bounds.maxX;
    const totalWidth = rightmost - leftmost;
    
    // Calculate total width of all elements
    const totalElementsWidth = elementBounds.reduce((sum, item) => sum + item.width, 0);
    
    // Calculate available space for distribution (excluding element widths)
    const availableSpace = totalWidth - totalElementsWidth;
    const spaceBetween = availableSpace / (elementBounds.length - 1);

    // Calculate positions for each element's left edge
    const positions: number[] = [];
    let currentX = leftmost;
    for (let i = 0; i < elementBounds.length; i++) {
      positions.push(currentX);
      currentX += elementBounds[i].width + spaceBetween;
    }

    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => ({
      elements: state.elements.map((el: CanvasElement) => {
        const boundItemIndex = elementBounds.findIndex((item: ElementWithBounds) => item.element.id === el.id);
        if (boundItemIndex !== -1) {
          const boundItem = elementBounds[boundItemIndex];
          const targetLeftX = positions[boundItemIndex];
          const currentLeftX = boundItem.bounds.minX;
          const deltaX = formatToPrecision(targetLeftX - currentLeftX, PATH_DECIMAL_PRECISION);

          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            return {
              ...el,
              data: transformSubpathsData(pathData, 1, 1, deltaX, 0, 0),
            };
          }
        }
        return el;
      }),
    }));
  },

  distributeVertically: () => {
    const fullState = get() as CanvasStore;
    const selectedElements = fullState.elements.filter((el: CanvasElement) => fullState.selectedIds.includes(el.id));
    if (selectedElements.length < 3) return;

    // Calculate bounds for all selected elements
    const elementBounds: ElementWithBounds[] = [];

    selectedElements.forEach((el: CanvasElement) => {
      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        const bounds = measurePath(pathData.subPaths, pathData.strokeWidth, fullState.viewport.zoom);
        elementBounds.push({
          element: el,
          bounds,
          centerX: (bounds.minX + bounds.maxX) / 2,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY
        });
      }
    });

    if (elementBounds.length < 3) return;

    // Sort by current center Y position
    elementBounds.sort((a: ElementWithBounds, b: ElementWithBounds) => {
      const centerY_a = (a.bounds.minY + a.bounds.maxY) / 2;
      const centerY_b = (b.bounds.minY + b.bounds.maxY) / 2;
      return centerY_a - centerY_b;
    });

    // Calculate the available space between elements
    const topmost = elementBounds[0].bounds.minY;
    const bottommost = elementBounds[elementBounds.length - 1].bounds.maxY;
    const totalHeight = bottommost - topmost;
    
    // Calculate total height of all elements
    const totalElementsHeight = elementBounds.reduce((sum, item) => {
      const height = item.bounds.maxY - item.bounds.minY;
      return sum + height;
    }, 0);
    
    // Calculate available space for distribution (excluding element heights)
    const availableSpace = totalHeight - totalElementsHeight;
    const spaceBetween = availableSpace / (elementBounds.length - 1);

    // Calculate positions for each element's top edge
    const positions: number[] = [];
    let currentY = topmost;
    for (let i = 0; i < elementBounds.length; i++) {
      positions.push(currentY);
      const elementHeight = elementBounds[i].bounds.maxY - elementBounds[i].bounds.minY;
      currentY += elementHeight + spaceBetween;
    }

    const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
    setStore((state) => ({
      elements: state.elements.map((el: CanvasElement) => {
        const boundItemIndex = elementBounds.findIndex((item: ElementWithBounds) => item.element.id === el.id);
        if (boundItemIndex !== -1) {
          const boundItem = elementBounds[boundItemIndex];
          const targetTopY = positions[boundItemIndex];
          const currentTopY = boundItem.bounds.minY;
          const deltaY = formatToPrecision(targetTopY - currentTopY, PATH_DECIMAL_PRECISION);

          if (el.type === 'path') {
            const pathData = el.data as import('../../../types').PathData;
            return {
              ...el,
              data: transformSubpathsData(pathData, 1, 1, 0, deltaY, 0),
            };
          }
        }
        return el;
      }),
    }));
  },
});