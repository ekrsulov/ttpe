import { formatToPrecision, PATH_DECIMAL_PRECISION } from './index';
import type { Point } from '../types';

/**
 * Helper utilities for coordinate and geometry formatting
 * Consolidates common patterns used throughout the application
 */

/**
 * Format a point to the standard precision
 */
export const formatPoint = (point: Point): Point => ({
  x: formatToPrecision(point.x, PATH_DECIMAL_PRECISION),
  y: formatToPrecision(point.y, PATH_DECIMAL_PRECISION)
});

/**
 * Format delta values (commonly used for translations)
 */
export const formatDelta = (deltaX: number, deltaY: number) => ({
  deltaX: formatToPrecision(deltaX, PATH_DECIMAL_PRECISION),
  deltaY: formatToPrecision(deltaY, PATH_DECIMAL_PRECISION)
});

/**
 * Format bounds object
 */
export const formatBounds = (bounds: { minX: number; minY: number; maxX: number; maxY: number }) => ({
  minX: formatToPrecision(bounds.minX, PATH_DECIMAL_PRECISION),
  minY: formatToPrecision(bounds.minY, PATH_DECIMAL_PRECISION),
  maxX: formatToPrecision(bounds.maxX, PATH_DECIMAL_PRECISION),
  maxY: formatToPrecision(bounds.maxY, PATH_DECIMAL_PRECISION)
});