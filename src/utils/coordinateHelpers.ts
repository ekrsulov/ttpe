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
 * Format multiple points at once
 */
export const formatPoints = (points: Point[]): Point[] => 
  points.map(formatPoint);

/**
 * Format a coordinate pair with custom precision
 */
export const formatCoordinate = (x: number, y: number, precision: number = PATH_DECIMAL_PRECISION): Point => ({
  x: formatToPrecision(x, precision),
  y: formatToPrecision(y, precision)
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

/**
 * Format viewport coordinates (pan values)
 */
export const formatViewportCoordinates = (panX: number, panY: number) => ({
  panX: formatToPrecision(panX, PATH_DECIMAL_PRECISION),
  panY: formatToPrecision(panY, PATH_DECIMAL_PRECISION)
});

/**
 * Check if two points are equal within precision tolerance
 */
export const pointsEqual = (p1: Point, p2: Point, tolerance: number = 0.01): boolean => {
  return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
};

/**
 * Calculate distance between two points
 */
export const pointDistance = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate center point between two points
 */
export const centerPoint = (p1: Point, p2: Point): Point => formatPoint({
  x: (p1.x + p2.x) / 2,
  y: (p1.y + p2.y) / 2
});