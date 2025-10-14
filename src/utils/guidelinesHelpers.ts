/**
 * Guidelines Helper Functions
 * Centralized functions for bounds calculation and distance detection
 */

import type { PathData } from '../types';
import { measurePath } from './measurementUtils';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface ElementBoundsInfo {
  id: string;
  bounds: Bounds;
  centerX: number;
  centerY: number;
}

/**
 * Calculate bounds for all path elements
 * This function should be memoized at the component level
 */
export function calculateElementBoundsMap(
  elements: Array<{ id: string; type: string; data: unknown }>,
  excludeIds: string[],
  zoom: number = 1
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

    // Use measurePath for accurate bounds including stroke
    const bounds = measurePath(
      pathData.subPaths,
      pathData.strokeWidth || 0,
      zoom
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

export interface DistancePair {
  distance: number;
  start: number;
  end: number;
  ids: [string, string];
  bounds1: Bounds;
  bounds2: Bounds;
}

/**
 * Aggregate distances for a given axis (horizontal or vertical)
 * Filters by projection bands and groups by distance value
 */
export function aggregateDistances(
  boundsMap: Map<string, ElementBoundsInfo>,
  axis: 'horizontal' | 'vertical'
): Map<number, DistancePair[]> {
  const distanceMap = new Map<number, DistancePair[]>();
  const boundsArray = Array.from(boundsMap.values());

  for (let i = 0; i < boundsArray.length - 1; i++) {
    for (let j = i + 1; j < boundsArray.length; j++) {
      const info1 = boundsArray[i];
      const info2 = boundsArray[j];

      if (axis === 'horizontal') {
        // Check if Y ranges overlap (in horizontal band)
        if (!rangesOverlap(
          info1.bounds.minY,
          info1.bounds.maxY,
          info2.bounds.minY,
          info2.bounds.maxY
        )) {
          continue;
        }

        // Check if elements are horizontally adjacent
        const distance1 = Math.round(info2.bounds.minX - info1.bounds.maxX);
        const distance2 = Math.round(info1.bounds.minX - info2.bounds.maxX);

        if (distance1 > 0) {
          const pairs = distanceMap.get(distance1) || [];
          pairs.push({
            distance: distance1,
            start: info1.bounds.maxX,
            end: info2.bounds.minX,
            ids: [info1.id, info2.id],
            bounds1: info1.bounds,
            bounds2: info2.bounds
          });
          distanceMap.set(distance1, pairs);
        }

        if (distance2 > 0) {
          const pairs = distanceMap.get(distance2) || [];
          pairs.push({
            distance: distance2,
            start: info2.bounds.maxX,
            end: info1.bounds.minX,
            ids: [info2.id, info1.id],
            bounds1: info2.bounds,
            bounds2: info1.bounds
          });
          distanceMap.set(distance2, pairs);
        }
      } else {
        // Vertical axis
        // Check if X ranges overlap (in vertical band)
        if (!rangesOverlap(
          info1.bounds.minX,
          info1.bounds.maxX,
          info2.bounds.minX,
          info2.bounds.maxX
        )) {
          continue;
        }

        // Check if elements are vertically adjacent
        const distance1 = Math.round(info2.bounds.minY - info1.bounds.maxY);
        const distance2 = Math.round(info1.bounds.minY - info2.bounds.maxY);

        if (distance1 > 0) {
          const pairs = distanceMap.get(distance1) || [];
          pairs.push({
            distance: distance1,
            start: info1.bounds.maxY,
            end: info2.bounds.minY,
            ids: [info1.id, info2.id],
            bounds1: info1.bounds,
            bounds2: info2.bounds
          });
          distanceMap.set(distance1, pairs);
        }

        if (distance2 > 0) {
          const pairs = distanceMap.get(distance2) || [];
          pairs.push({
            distance: distance2,
            start: info2.bounds.maxY,
            end: info1.bounds.minY,
            ids: [info2.id, info1.id],
            bounds1: info2.bounds,
            bounds2: info1.bounds
          });
          distanceMap.set(distance2, pairs);
        }
      }
    }
  }

  return distanceMap;
}
