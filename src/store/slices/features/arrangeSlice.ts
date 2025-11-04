import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../../types';
import type { CanvasStore } from '../../canvasStore';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../../utils';
import {
  translatePathData,
  alignmentTargets,
  scalePathData
} from '../../../utils/transformationUtils';
import { 
  collectSelectedElementBounds,
  getTopLevelSelectedElements 
} from '../../../utils/arrangementUtils';

/**
 * Helper function to translate all descendants of a group
 */
const translateGroupDescendants = (
  elements: CanvasElement[],
  groupId: string,
  deltaX: number,
  deltaY: number
): CanvasElement[] => {
  const elementMap = new Map(elements.map(el => [el.id, el]));
  const group = elementMap.get(groupId);
  
  if (!group || group.type !== 'group') {
    return elements;
  }

  // Collect all descendant IDs
  const descendants = new Set<string>();
  const queue = [...group.data.childIds];

  while (queue.length > 0) {
    const childId = queue.shift();
    if (!childId) continue;
    
    descendants.add(childId);
    const child = elementMap.get(childId);
    if (child && child.type === 'group') {
      queue.push(...child.data.childIds);
    }
  }

  // Translate all descendants
  return elements.map(el => {
    if (descendants.has(el.id) && el.type === 'path') {
      const pathData = el.data as import('../../../types').PathData;
      return { ...el, data: translatePathData(pathData, deltaX, deltaY) };
    }
    return el;
  });
};

/**
 * Helper function to scale all descendants of a group
 */
const scaleGroupDescendants = (
  elements: CanvasElement[],
  groupId: string,
  scaleX: number,
  scaleY: number,
  centerX: number,
  centerY: number
): CanvasElement[] => {
  const elementMap = new Map(elements.map(el => [el.id, el]));
  const group = elementMap.get(groupId);
  
  if (!group || group.type !== 'group') {
    return elements;
  }

  // Collect all descendant IDs
  const descendants = new Set<string>();
  const queue = [...group.data.childIds];

  while (queue.length > 0) {
    const childId = queue.shift();
    if (!childId) continue;
    
    descendants.add(childId);
    const child = elementMap.get(childId);
    if (child && child.type === 'group') {
      queue.push(...child.data.childIds);
    }
  }

  // Scale all descendants
  return elements.map(el => {
    if (descendants.has(el.id) && el.type === 'path') {
      const pathData = el.data as import('../../../types').PathData;
      return { ...el, data: scalePathData(pathData, scaleX, scaleY, centerX, centerY) };
    }
    return el;
  });
};

// Helper function to perform element alignment using the new consolidated utilities
const alignElements = (
  elements: CanvasElement[],
  selectedIds: string[],
  zoom: number,
  targetCalculator: import('../../../utils/transformationUtils').TargetCalculator,
  axis: import('../../../utils/transformationUtils').Axis
): CanvasElement[] => {
  // Use centralized bounds collection (handles groups automatically)
  const elementBounds = collectSelectedElementBounds(elements, selectedIds, zoom);
  
  if (elementBounds.length < 2) return elements;

  // Calculate target position based on all top-level elements/groups
  const boundsArray = elementBounds.map(item => item.bounds);
  const targetValue = targetCalculator(boundsArray);

  // Get top-level elements (groups and standalone paths)
  const topLevelIds = getTopLevelSelectedElements(elements, selectedIds);
  const topLevelSet = new Set(topLevelIds);

  // Update elements
  let updatedElements = elements;

  elementBounds.forEach(item => {
    if (!topLevelSet.has(item.element.id)) return;

    const currentValue = targetCalculator([item.bounds]);
    let deltaX = 0;
    let deltaY = 0;

    if (axis === 'x') {
      deltaX = formatToPrecision(targetValue - currentValue, PATH_DECIMAL_PRECISION);
    } else {
      deltaY = formatToPrecision(targetValue - currentValue, PATH_DECIMAL_PRECISION);
    }

    if (isNaN(deltaX) || isNaN(deltaY)) return;

    // Handle groups and individual paths differently
    if (item.element.type === 'group') {
      // Translate all descendants of the group
      updatedElements = translateGroupDescendants(updatedElements, item.element.id, deltaX, deltaY);
    } else if (item.element.type === 'path') {
      // Translate individual path
      updatedElements = updatedElements.map(el => {
        if (el.id === item.element.id && el.type === 'path') {
          const pathData = el.data as import('../../../types').PathData;
          return { ...el, data: translatePathData(pathData, deltaX, deltaY) };
        }
        return el;
      });
    }
  });

  return updatedElements;
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
  // Use centralized bounds collection (handles groups automatically)
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

  // Get top-level elements (groups and standalone paths)
  const topLevelIds = getTopLevelSelectedElements(elements, selectedIds);
  const topLevelSet = new Set(topLevelIds);

  // Update elements
  let updatedElements = elements;

  elementBounds.forEach((boundItem, boundItemIndex) => {
    if (!topLevelSet.has(boundItem.element.id)) return;

    const targetPos = positions[boundItemIndex];
    const currentPos = axis === 'x' ? boundItem.bounds.minX : boundItem.bounds.minY;
    const delta = formatToPrecision(targetPos - currentPos, PATH_DECIMAL_PRECISION);

    if (isNaN(delta)) return;

    // Handle groups and individual paths differently
    if (boundItem.element.type === 'group') {
      // Translate all descendants of the group
      updatedElements = translateGroupDescendants(
        updatedElements,
        boundItem.element.id,
        axis === 'x' ? delta : 0,
        axis === 'y' ? delta : 0
      );
    } else if (boundItem.element.type === 'path') {
      // Translate individual path
      updatedElements = updatedElements.map((el: CanvasElement) => {
        if (el.id === boundItem.element.id && el.type === 'path') {
          const pathData = el.data as import('../../../types').PathData;
          return {
            ...el,
            data: translatePathData(pathData, axis === 'x' ? delta : 0, axis === 'y' ? delta : 0),
          };
        }
        return el;
      });
    }
  });

  return updatedElements;
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
  // Use centralized bounds collection (handles groups automatically)
  const elementBounds = collectSelectedElementBounds(elements, selectedIds, zoom);

  if (elementBounds.length < 2) return elements;

  // Find the largest dimension
  const largestSize = Math.max(...elementBounds.map(item => 
    dimension === 'width' ? item.width : item.height
  ));

  // Get top-level elements (groups and standalone paths)
  const topLevelIds = getTopLevelSelectedElements(elements, selectedIds);
  const topLevelSet = new Set(topLevelIds);

  // Scale each element to match the largest dimension
  let updatedElements = elements;

  elementBounds.forEach((boundItem) => {
    if (!topLevelSet.has(boundItem.element.id)) return;

    const currentSize = dimension === 'width' ? boundItem.width : boundItem.height;
    if (currentSize === 0) return; // Avoid division by zero

    const scaleFactor = largestSize / currentSize;
    
    // Only scale if the element is not already the largest
    if (Math.abs(scaleFactor - 1) < 0.0001) return;

    const bounds = boundItem.bounds;
    
    // Calculate the center point of the element for scaling
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Scale only on the specified dimension
    const scaleX = dimension === 'width' ? scaleFactor : 1;
    const scaleY = dimension === 'height' ? scaleFactor : 1;

    // Handle groups and individual paths differently
    if (boundItem.element.type === 'group') {
      // Scale all descendants of the group
      updatedElements = scaleGroupDescendants(
        updatedElements,
        boundItem.element.id,
        scaleX,
        scaleY,
        centerX,
        centerY
      );
    } else if (boundItem.element.type === 'path') {
      // Scale individual path
      updatedElements = updatedElements.map((el: CanvasElement) => {
        if (el.id === boundItem.element.id && el.type === 'path') {
          const pathData = el.data as import('../../../types').PathData;
          return {
            ...el,
            data: scalePathData(pathData, scaleX, scaleY, centerX, centerY)
          };
        }
        return el;
      });
    }
  });

  return updatedElements;
};

// Helper function to match sizes - either width or height to the smallest element
const matchSizeToSmallest = (
  elements: CanvasElement[],
  selectedIds: string[],
  zoom: number,
  dimension: 'width' | 'height'
): CanvasElement[] => {
  // Use centralized bounds collection (handles groups automatically)
  const elementBounds = collectSelectedElementBounds(elements, selectedIds, zoom);

  if (elementBounds.length < 2) return elements;

  // Find the smallest dimension
  const smallestSize = Math.min(...elementBounds.map(item => 
    dimension === 'width' ? item.width : item.height
  ));

  // Get top-level elements (groups and standalone paths)
  const topLevelIds = getTopLevelSelectedElements(elements, selectedIds);
  const topLevelSet = new Set(topLevelIds);

  // Scale each element to match the smallest dimension
  let updatedElements = elements;

  elementBounds.forEach((boundItem) => {
    if (!topLevelSet.has(boundItem.element.id)) return;

    const currentSize = dimension === 'width' ? boundItem.width : boundItem.height;
    if (currentSize === 0) return; // Avoid division by zero

    const scaleFactor = smallestSize / currentSize;
    
    // Only scale if the element is not already the smallest
    if (Math.abs(scaleFactor - 1) < 0.0001) return;

    const bounds = boundItem.bounds;
    
    // Calculate the center point of the element for scaling
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Scale only on the specified dimension
    const scaleX = dimension === 'width' ? scaleFactor : 1;
    const scaleY = dimension === 'height' ? scaleFactor : 1;

    // Handle groups and individual paths differently
    if (boundItem.element.type === 'group') {
      // Scale all descendants of the group
      updatedElements = scaleGroupDescendants(
        updatedElements,
        boundItem.element.id,
        scaleX,
        scaleY,
        centerX,
        centerY
      );
    } else if (boundItem.element.type === 'path') {
      // Scale individual path
      updatedElements = updatedElements.map((el: CanvasElement) => {
        if (el.id === boundItem.element.id && el.type === 'path') {
          const pathData = el.data as import('../../../types').PathData;
          return {
            ...el,
            data: scalePathData(pathData, scaleX, scaleY, centerX, centerY)
          };
        }
        return el;
      });
    }
  });

  return updatedElements;
};

// Helper function for matching sizes to largest
const performMatchSizeToLargest = (
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

// Helper function for matching sizes to smallest
const performMatchSizeToSmallest = (
  set: (updater: (state: CanvasStore) => Partial<CanvasStore>) => void,
  get: () => ArrangeSlice,
  dimension: 'width' | 'height'
) => {
  const fullState = get() as CanvasStore;
  const setStore = set as (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;

  setStore((state) => ({
    elements: matchSizeToSmallest(state.elements, fullState.selectedIds, fullState.viewport.zoom, dimension)
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
  matchWidthToSmallest: () => void;
  matchHeightToSmallest: () => void;
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
    performMatchSizeToLargest(set, get, 'width');
  },

  matchHeightToLargest: () => {
    performMatchSizeToLargest(set, get, 'height');
  },

  matchWidthToSmallest: () => {
    performMatchSizeToSmallest(set, get, 'width');
  },

  matchHeightToSmallest: () => {
    performMatchSizeToSmallest(set, get, 'height');
  },
});
