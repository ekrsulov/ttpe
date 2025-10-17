/**
 * Bounds Utilities - Single Source of Truth for Bounds Calculation
 * 
 * This module provides centralized, stroke-aware bounds calculation for canvas elements.
 * All bounds calculations should go through these utilities to ensure consistency.
 */

import type { CanvasElement, PathData, SubPath } from '../types';
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
 * Calculate stroke-aware bounds for a path element
 * This is the Single Source of Truth for bounds calculation
 * 
 * @param element - The canvas element (must be type 'path')
 * @param options - Options for bounds calculation
 * @returns The bounds including stroke if specified
 */
export function getPathBounds(
  element: CanvasElement,
  options: BoundsOptions = {}
): Bounds {
  const { zoom = 1, includeStroke = true } = options;
  
  if (element.type !== 'path') {
    throw new Error('getPathBounds only works with path elements');
  }

  const pathData = element.data as PathData;
  const effectiveStrokeWidth = includeStroke ? (pathData.strokeWidth || 0) : 0;
  
  return measurePath(pathData.subPaths, effectiveStrokeWidth, zoom);
}

/**
 * Calculate bounds from subpaths directly
 * Useful when you have raw subpath data without a full element
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

/**
 * Get the center point of bounds
 * 
 * @param bounds - The bounds to calculate center for
 * @returns The center point {x, y}
 */
export function getBoundsCenter(bounds: Bounds): { x: number; y: number } {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

/**
 * Get the width and height of bounds
 * 
 * @param bounds - The bounds to calculate dimensions for
 * @returns The dimensions {width, height}
 */
export function getBoundsDimensions(bounds: Bounds): { width: number; height: number } {
  return {
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}

/**
 * Get the area of bounds
 * 
 * @param bounds - The bounds to calculate area for
 * @returns The area
 */
export function getBoundsArea(bounds: Bounds): number {
  const { width, height } = getBoundsDimensions(bounds);
  return width * height;
}

/**
 * Calculate bounds from subpaths - convenience wrapper
 * This is an alias for getSubPathsBounds for backwards compatibility
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
