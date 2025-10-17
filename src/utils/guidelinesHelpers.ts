/**
 * Guidelines Helper Functions
 * Single Source of Truth (SST) for geometry calculations
 * 
 * This module provides centralized utilities for:
 * - Range overlap detection
 * - Distance aggregation
 * - Memoization support for performance
 */

import type { PathData } from '../types';
import { calculateBounds, type Bounds } from './boundsUtils';

export type { Bounds } from './boundsUtils';
export { calculateBounds } from './boundsUtils';

export interface ElementBoundsInfo {
  id: string;
  bounds: Bounds;
  centerX: number;
  centerY: number;
}

/**
 * Calculate bounds for all path elements
 * 
 * @param elements - Array of elements to process
 * @param excludeIds - IDs to exclude from calculation
 * @param zoom - The zoom level (default: 1)
 * @param options - Options for bounds calculation
 * @returns Map of element IDs to their bounds info
 */
export function calculateElementBoundsMap(
  elements: Array<{ id: string; type: string; data: unknown }>,
  excludeIds: string[],
  zoom: number = 1,
  options: { includeStroke?: boolean } = { includeStroke: true }
): Map<string, ElementBoundsInfo> {
  const boundsMap = new Map<string, ElementBoundsInfo>();

  elements.forEach((element) => {
    if (element.type !== 'path' || excludeIds.includes(element.id)) {
      return;
    }

    const pathData = element.data as PathData;
    if (!pathData?.subPaths) {
      return;
    }

    // Use calculateBounds for consistent stroke-aware bounds
    const bounds = calculateBounds(
      pathData.subPaths,
      pathData.strokeWidth || 0,
      zoom,
      options
    );

    if (!isFinite(bounds.minX)) {
      return;
    }

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    boundsMap.set(element.id, {
      id: element.id,
      bounds,
      centerX,
      centerY
    });
  });

  return boundsMap;
}

/**
 * Check if two ranges overlap (for projection band filtering)
 */
export function rangesOverlap(
  min1: number,
  max1: number,
  min2: number,
  max2: number
): boolean {
  return !(max1 < min2 || max2 < min1);
}

/**
 * Calculate perpendicular midpoint for distance visualization
 * For horizontal distances: Y coordinate at vertical overlap center
 * For vertical distances: X coordinate at horizontal overlap center
 * 
 * @param axis - The axis ('horizontal' or 'vertical')
 * @param bounds1 - First element bounds
 * @param bounds2 - Second element bounds
 * @returns The perpendicular midpoint coordinate
 */
export function calculatePerpendicularMidpoint(
  axis: 'horizontal' | 'vertical',
  bounds1: Bounds,
  bounds2: Bounds
): number {
  if (axis === 'horizontal') {
    // Y coordinate at vertical overlap center
    const overlapMinY = Math.max(bounds1.minY, bounds2.minY);
    const overlapMaxY = Math.min(bounds1.maxY, bounds2.maxY);
    return (overlapMinY + overlapMaxY) / 2;
  } else {
    // X coordinate at horizontal overlap center
    const overlapMinX = Math.max(bounds1.minX, bounds2.minX);
    const overlapMaxX = Math.min(bounds1.maxX, bounds2.maxX);
    return (overlapMinX + overlapMaxX) / 2;
  }
}
