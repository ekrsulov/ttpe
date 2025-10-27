import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';
import type { CanvasStore } from '../../canvasStore';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../../utils';
import {
  translatePathData,
  alignmentTargets,
  scalePathData
} from '../../../utils/transformationUtils';
import { collectSelectedElementBounds } from '../../../utils/arrangementUtils';
import { measurePath } from '../../../utils/measurementUtils';



// Helper function to perform element alignment using the new consolidated utilities
const alignElements = (
  elements: CanvasElement[],
  selectedIds: string[],
  zoom: number,
  targetCalculator: import('../../../utils/transformationUtils').TargetCalculator,
  axis: import('../../../utils/transformationUtils').Axis
): CanvasElement[] => {
  const selectedElements = elements.filter(el => selectedIds.includes(el.id));
  if (selectedElements.length < 2) return elements;

  // Calculate bounds for all selected elements
  const boundsArray = selectedElements.map(el => {
    if (el.type === 'path') {
      const pathData = el.data as import('../../../types').PathData;
      return measurePath(pathData.subPaths, pathData.strokeWidth, zoom);
    }
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }).filter(bounds => bounds.minX !== 0 || bounds.minY !== 0 || bounds.maxX !== 0 || bounds.maxY !== 0);

  if (boundsArray.length === 0) return elements;

  // Calculate target position
  const targetValue = targetCalculator(boundsArray);

  // Update elements
  return elements.map(el => {
    if (!selectedIds.includes(el.id) || el.type !== 'path') return el;

    const pathData = el.data as import('../../../types').PathData;
    const currentBounds = measurePath(pathData.subPaths, pathData.strokeWidth, zoom);

    let deltaX = 0;
    let deltaY = 0;

    if (axis === 'x') {
      const currentValue = targetCalculator([currentBounds]);
      deltaX = formatToPrecision(targetValue - currentValue, PATH_DECIMAL_PRECISION);
    } else {
      const currentValue = targetCalculator([currentBounds]);
      deltaY = formatToPrecision(targetValue - currentValue, PATH_DECIMAL_PRECISION);
    }

    if (!isNaN(deltaX) && !isNaN(deltaY)) {
      const newPathData = translatePathData(pathData, deltaX, deltaY);
      return { ...el, data: newPathData };
    }

    return el;
  });
};

// Helper function for parameterized alignment
const performAlignment = (
  set: (updater: (state: CanvasStore) => Partial<CanvasStore>) => void,
  get: () => ArrangeSlice,
  targetCalculator: import('../../../utils/transformationUtils').TargetCalculator,
  axis: import('../../../utils/transformationUtils').Axis
) => {
  const fullState = get() as CanvasStore;
  const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;

  setStore((state) => ({
    elements: alignElements(state.elements, fullState.selectedIds, fullState.viewport.zoom, targetCalculator, axis)
  }));
};

// Helper function for distributing elements along an axis
const distributeElements = (
  elements: CanvasElement[],
  selectedIds: string[],
  zoom: number,
  axis: 'x' | 'y'
): CanvasElement[] => {
  const selectedElements = elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
  if (selectedElements.length < 3) return elements;

  // Use centralized bounds collection
  const elementBounds = collectSelectedElementBounds(elements, selectedIds, zoom);

  if (elementBounds.length < 3) return elements;

  // Sort by current center position
  if (axis === 'x') {
    elementBounds.sort((a, b) => a.centerX - b.centerX);
  } else {
    elementBounds.sort((a, b) => a.centerY - b.centerY);
  }

  // Calculate the available space between elements
  const leftmost = elementBounds[0].bounds.minX;
  const rightmost = elementBounds[elementBounds.length - 1].bounds.maxX;
  const topmost = elementBounds[0].bounds.minY;
  const bottommost = elementBounds[elementBounds.length - 1].bounds.maxY;
  const totalWidth = rightmost - leftmost;
  const totalHeight = bottommost - topmost;

  // Calculate total width/height of all elements
  const totalElementsWidth = elementBounds.reduce((sum, item) => sum + item.width, 0);
  const totalElementsHeight = elementBounds.reduce((sum, item) => sum + item.height, 0);

  // Calculate available space for distribution (excluding element widths/heights)
  const availableSpace = axis === 'x' ? totalWidth - totalElementsWidth : totalHeight - totalElementsHeight;
  const spaceBetween = availableSpace / (elementBounds.length - 1);

  // Calculate positions for each element's left/top edge
  const positions: number[] = [];
  let currentPos = axis === 'x' ? leftmost : topmost;
  for (let i = 0; i < elementBounds.length; i++) {
    positions.push(currentPos);
    const elementSize = axis === 'x' ? elementBounds[i].width : elementBounds[i].height;
    currentPos += elementSize + spaceBetween;
  }

  return elements.map((el: CanvasElement) => {
    const boundItemIndex = elementBounds.findIndex((item) => item.element.id === el.id);
    if (boundItemIndex !== -1) {
      const boundItem = elementBounds[boundItemIndex];
      const targetPos = positions[boundItemIndex];
      const currentPos = axis === 'x' ? boundItem.bounds.minX : boundItem.bounds.minY;
      const delta = formatToPrecision(targetPos - currentPos, PATH_DECIMAL_PRECISION);

      if (el.type === 'path') {
        const pathData = el.data as import('../../../types').PathData;
        return {
          ...el,
          data: translatePathData(pathData, axis === 'x' ? delta : 0, axis === 'y' ? delta : 0),
        };
      }
    }
    return el;
  });
};

// Helper function for distribution - reduces duplication in horizontal/vertical distribution
const performDistribution = (
  set: (updater: (state: CanvasStore) => Partial<CanvasStore>) => void,
  get: () => ArrangeSlice,
  axis: 'x' | 'y'
) => {
  const fullState = get() as CanvasStore;
  const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;

  setStore((state) => ({
    elements: distributeElements(state.elements, fullState.selectedIds, fullState.viewport.zoom, axis)
  }));
};

// Helper function to match sizes - either width or height to the largest element
const matchSizeToLargest = (
  elements: CanvasElement[],
  selectedIds: string[],
  zoom: number,
  dimension: 'width' | 'height'
): CanvasElement[] => {
  const selectedElements = elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
  if (selectedElements.length < 2) return elements;

  // Use centralized bounds collection
  const elementBounds = collectSelectedElementBounds(elements, selectedIds, zoom);

  if (elementBounds.length < 2) return elements;

  // Find the largest dimension
  const largestSize = Math.max(...elementBounds.map(item => 
    dimension === 'width' ? item.width : item.height
  ));

  // Scale each element to match the largest dimension
  return elements.map((el: CanvasElement) => {
    const boundItem = elementBounds.find((item) => item.element.id === el.id);
    if (!boundItem) return el;

    const currentSize = dimension === 'width' ? boundItem.width : boundItem.height;
    if (currentSize === 0) return el; // Avoid division by zero

    const scaleFactor = largestSize / currentSize;
    
    // Only scale if the element is not already the largest
    if (Math.abs(scaleFactor - 1) < 0.0001) return el;

    if (el.type === 'path') {
      const pathData = el.data as import('../../../types').PathData;
      const bounds = boundItem.bounds;
      
      // Calculate the center point of the element for scaling
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      // Scale the path data - scale only on the specified dimension
      const scaleX = dimension === 'width' ? scaleFactor : 1;
      const scaleY = dimension === 'height' ? scaleFactor : 1;
      
      const newPathData = scalePathData(pathData, scaleX, scaleY, centerX, centerY);

      return {
        ...el,
        data: newPathData
      };
    }

    return el;
  });
};

// Helper function for matching sizes
const performMatchSize = (
  set: (updater: (state: CanvasStore) => Partial<CanvasStore>) => void,
  get: () => ArrangeSlice,
  dimension: 'width' | 'height'
) => {
  const fullState = get() as CanvasStore;
  const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;

  setStore((state) => ({
    elements: matchSizeToLargest(state.elements, fullState.selectedIds, fullState.viewport.zoom, dimension)
  }));
};

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
  matchWidthToLargest: () => void;
  matchHeightToLargest: () => void;
}

export const createArrangeSlice: StateCreator<ArrangeSlice> = (set, get, _api) => ({
  // Actions
  alignLeft: () => {
    performAlignment(set, get, alignmentTargets.left, 'x');
  },

  alignCenter: () => {
    performAlignment(set, get, alignmentTargets.center, 'x');
  },

  alignRight: () => {
    performAlignment(set, get, alignmentTargets.right, 'x');
  },

  alignTop: () => {
    performAlignment(set, get, alignmentTargets.top, 'y');
  },

  alignMiddle: () => {
    performAlignment(set, get, alignmentTargets.middle, 'y');
  },

  alignBottom: () => {
    performAlignment(set, get, alignmentTargets.bottom, 'y');
  },

  distributeHorizontally: () => {
    performDistribution(set, get, 'x');
  },

  distributeVertically: () => {
    performDistribution(set, get, 'y');
  },

  matchWidthToLargest: () => {
    performMatchSize(set, get, 'width');
  },

  matchHeightToLargest: () => {
    performMatchSize(set, get, 'height');
  },
});
