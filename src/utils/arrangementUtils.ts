/**
 * Arrangement Utilities
 * 
 * Centralized helpers for building element bounds collections used by
 * distribution and size-matching operations.
 */

import type { CanvasElement, PathData } from '../types';
import { calculateBounds } from './boundsUtils';

export interface ElementWithBounds {
  element: CanvasElement;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

/**
 * Collect bounds for all selected elements
 * Uses stroke-aware bounds calculation for consistency
 * 
 * @param elements - All canvas elements
 * @param selectedIds - IDs of selected elements
 * @param zoom - Current zoom level
 * @returns Array of elements with their bounds information
 */
export function collectSelectedElementBounds(
  elements: CanvasElement[],
  selectedIds: string[],
  zoom: number
): ElementWithBounds[] {
  const selectedElements = elements.filter((el: CanvasElement) => 
    selectedIds.includes(el.id)
  );

  const elementBounds: ElementWithBounds[] = [];

  selectedElements.forEach((el: CanvasElement) => {
    if (el.type === 'path') {
      const pathData = el.data as PathData;
      
      // Use centralized bounds calculation with stroke support
      const bounds = calculateBounds(
        pathData.subPaths,
        pathData.strokeWidth || 0,
        zoom,
        { includeStroke: true }
      );

      if (!isFinite(bounds.minX)) {
        return; // Skip invalid bounds
      }

      elementBounds.push({
        element: el,
        bounds,
        centerX: (bounds.minX + bounds.maxX) / 2,
        centerY: (bounds.minY + bounds.maxY) / 2,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY
      });
    }
  });

  return elementBounds;
}
