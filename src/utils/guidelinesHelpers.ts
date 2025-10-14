/**
 * Guidelines Helper Functions
 * Single Source of Truth (SST) for geometry calculations
 * 
 * This module provides centralized utilities for:
 * - Range overlap detection
 * - Distance aggregation
 * - Memoization support for performance
 */

import type { PathData, SubPath } from '../types';
import { getSubPathsBounds, type Bounds } from './boundsUtils';

export type { Bounds } from './boundsUtils';

export interface ElementBoundsInfo {
  id: string;
  bounds: Bounds;
  centerX: number;
  centerY: number;
}

// Memoization cache for bounds calculations
const boundsCache = new WeakMap<SubPath[], Bounds>();
const cacheKeys = new WeakMap<SubPath[], string>();

/**
 * Calculate stroke-aware bounds for a single element
 * 
 * @param subPaths - The subpaths of the element
 * @param strokeWidth - The stroke width (default: 0)
 * @param zoom - The zoom level (default: 1)
 * @param options - Options for bounds calculation
 * @returns The bounds including stroke if specified
 */
export function calculateBounds(
  subPaths: SubPath[],
  strokeWidth: number = 0,
  zoom: number = 1,
  options: { includeStroke?: boolean } = { includeStroke: true }
): Bounds {
  return getSubPathsBounds(subPaths, strokeWidth, { zoom, includeStroke: options.includeStroke });
}

/**
 * Calculate stroke-aware bounds with memoization support
 * Uses a cache key based on structural properties to avoid redundant calculations
 * 
 * @param subPaths - The subpaths of the element
 * @param strokeWidth - The stroke width
 * @param zoom - The zoom level
 * @param cacheKey - Optional cache key (e.g., element ID + version)
 * @returns The bounds including stroke
 */
export function getMemoizedBounds(
  subPaths: SubPath[],
  strokeWidth: number,
  zoom: number,
  cacheKey?: string
): Bounds {
  // If cache key is provided and matches, return cached value
  if (cacheKey && cacheKeys.get(subPaths) === cacheKey) {
    const cached = boundsCache.get(subPaths);
    if (cached) {
      return cached;
    }
  }

  // Calculate new bounds
  const bounds = calculateBounds(subPaths, strokeWidth, zoom);

  // Cache the result
  if (cacheKey) {
    cacheKeys.set(subPaths, cacheKey);
  }
  boundsCache.set(subPaths, bounds);

  return bounds;
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
