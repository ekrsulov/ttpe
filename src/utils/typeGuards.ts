/**
 * Type guard utilities for canvas elements
 * Provides type-safe checks for element properties
 */

import type { CanvasElement, PathData } from '../types';

/**
 * Type guard to check if an element is a path element
 */
export function isPathElement(element: CanvasElement): element is CanvasElement & { type: 'path'; data: PathData } {
  return element.type === 'path' && 
         element.data !== null && 
         typeof element.data === 'object';
}

/**
 * Type guard to check if data has strokeColor property
 */
export function hasStrokeColor(data: unknown): data is { strokeColor: string } {
  return typeof data === 'object' && 
         data !== null && 
         'strokeColor' in data;
}

/**
 * Type guard to check if data has fillColor property
 */
export function hasFillColor(data: unknown): data is { fillColor: string } {
  return typeof data === 'object' && 
         data !== null && 
         'fillColor' in data;
}

/**
 * Type guard to check if data has strokeWidth property
 */
export function hasStrokeWidth(data: unknown): data is { strokeWidth: number } {
  return typeof data === 'object' && 
         data !== null && 
         'strokeWidth' in data;
}

/**
 * Type guard to check if data has strokeOpacity property
 */
export function hasStrokeOpacity(data: unknown): data is { strokeOpacity: number } {
  return typeof data === 'object' && 
         data !== null && 
         'strokeOpacity' in data;
}

/**
 * Type guard to check if data is PathData
 */
export function isPathData(data: unknown): data is PathData {
  return typeof data === 'object' && 
         data !== null && 
         'subPaths' in data &&
         'strokeWidth' in data &&
         'strokeColor' in data &&
         'fillColor' in data;
}

/**
 * Combined type guard for common path element checks
 * Checks if element is a path with valid PathData
 */
export function isValidPathElement(element: CanvasElement): element is CanvasElement & { type: 'path'; data: PathData } {
  return isPathElement(element) && isPathData(element.data);
}
