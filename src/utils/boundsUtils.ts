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

// Internal interface - only used within this module
interface BoundsOptions {
  zoom?: number;
  includeStroke?: boolean;
}

/**
 * Calculate bounds from subpaths directly
 * Internal helper - use calculateBounds for public API
 * 
 * @param subPaths - The subpaths to measure
 * @param strokeWidth - The stroke width (default: 0)
 * @param options - Options for bounds calculation
 * @returns The bounds including stroke if specified
 */
function getSubPathsBounds(
  subPaths: SubPath[],
  strokeWidth: number = 0,
  options: BoundsOptions = {}
): Bounds {
  const { zoom = 1, includeStroke = true } = options;
  const effectiveStrokeWidth = includeStroke ? strokeWidth : 0;
  
  return measurePath(subPaths, effectiveStrokeWidth, zoom);
}

/**
 * Calculate bounds from subpaths - convenience wrapper
 * This is the main public API for bounds calculation
 * 
 * @param subPaths - The subpaths to measure
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
