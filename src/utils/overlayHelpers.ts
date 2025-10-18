import { measureSubpathBounds } from './geometry';
import type { PathData } from '../types';
import { logger } from './logger';

export interface AdjustedBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Computes adjusted bounds with a zoom-dependent offset
 */
export function computeAdjustedBounds(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  zoom: number,
  offsetPx: number = 5
): AdjustedBounds {
  const offset = offsetPx / zoom;
  return {
    minX: bounds.minX - offset,
    minY: bounds.minY - offset,
    maxX: bounds.maxX + offset,
    maxY: bounds.maxY + offset,
  };
}

export interface SubpathBoundsResult {
  subpathIndex: number;
  bounds: AdjustedBounds;
  rawBounds: { minX: number; minY: number; maxX: number; maxY: number };
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Measures bounds for selected subpaths, returning adjusted bounds for each
 */
export function measureSelectedSubpaths(
  element: {
    id: string;
    type: string;
    data: unknown;
  },
  selectedSubpaths: Array<{
    elementId: string;
    subpathIndex: number;
  }>,
  zoom: number,
  offsetPx: number = 5
): SubpathBoundsResult[] {
  if (element.type !== 'path') return [];

  const results: SubpathBoundsResult[] = [];

  try {
    const pathData = element.data as PathData;
    const subpaths = pathData.subPaths;

    selectedSubpaths
      .filter(sp => sp.elementId === element.id)
      .forEach((selected) => {
        if (selected.subpathIndex >= subpaths.length) return;

        const subpath = subpaths[selected.subpathIndex];
        const rawBounds = measureSubpathBounds(subpath, pathData.strokeWidth ?? 1, zoom);

        if (!rawBounds) return;

        const adjustedBounds = computeAdjustedBounds(rawBounds, zoom, offsetPx);
        const width = adjustedBounds.maxX - adjustedBounds.minX;
        const height = adjustedBounds.maxY - adjustedBounds.minY;
        const centerX = rawBounds.minX + (rawBounds.maxX - rawBounds.minX) / 2;
        const centerY = rawBounds.minY + (rawBounds.maxY - rawBounds.minY) / 2;

        results.push({
          subpathIndex: selected.subpathIndex,
          bounds: adjustedBounds,
          rawBounds,
          width,
          height,
          centerX,
          centerY,
        });
      });
  } catch (error) {
    logger.warn('Failed to calculate subpath bounds', error);
  }

  return results;
}
