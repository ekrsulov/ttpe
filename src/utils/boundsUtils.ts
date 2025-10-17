/**
 * Bounds Utilities - Single Source of Truth for Bounds Calculation
 * 
 * This module provides centralized, stroke-aware bounds calculation for canvas elements.
 * All bounds calculations should go through these utilities to ensure consistency.
 */

import type { SubPath } from '../types';
import { measurePath } from './measurementUtils';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface BoundsOptions {
  zoom?: number;
  includeStroke?: boolean;
}

/**
 * Calculate stroke-aware bounds directly from subpaths
 * This is the Single Source of Truth for bounds calculation
 *
 * @param subPaths - The subpaths to measure
 * @param strokeWidth - The stroke width (default: 0)
 * @param options - Options for bounds calculation
 * @returns The bounds including stroke if specified
 */
export function getSubPathsBounds(
  subPaths: SubPath[],
  strokeWidth: number = 0,
  options: BoundsOptions = {}
): Bounds {
  const { zoom = 1, includeStroke = true } = options;
  const effectiveStrokeWidth = includeStroke ? strokeWidth : 0;

  return measurePath(subPaths, effectiveStrokeWidth, zoom);
}
