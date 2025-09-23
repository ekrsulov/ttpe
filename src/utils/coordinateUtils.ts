import { formatToPrecision, PATH_DECIMAL_PRECISION } from './index';
import type { Point } from '../types';

/**
 * Converts screen coordinates to canvas coordinates accounting for viewport
 * @param svgElement - The SVG element to get bounding rect from
 * @param viewport - Viewport with zoom, panX, and panY
 * @param clientX - Screen X coordinate
 * @param clientY - Screen Y coordinate
 * @returns Canvas coordinates as Point
 */
export function mapPointerToCanvas(
  svgElement: SVGSVGElement | null,
  viewport: { zoom: number; panX: number; panY: number },
  clientX: number,
  clientY: number
): Point {
  const rect = svgElement?.getBoundingClientRect();
  if (!rect) {
    return {
      x: formatToPrecision(clientX, PATH_DECIMAL_PRECISION),
      y: formatToPrecision(clientY, PATH_DECIMAL_PRECISION)
    };
  }

  const canvasX = (clientX - rect.left - viewport.panX) / viewport.zoom;
  const canvasY = (clientY - rect.top - viewport.panY) / viewport.zoom;

  return {
    x: formatToPrecision(canvasX, PATH_DECIMAL_PRECISION),
    y: formatToPrecision(canvasY, PATH_DECIMAL_PRECISION)
  };
}

/**
 * Converts SVG coordinates to canvas coordinates accounting for viewport
 * @param svgX - SVG X coordinate
 * @param svgY - SVG Y coordinate
 * @param viewport - Viewport with zoom, panX, and panY
 * @returns Canvas coordinates as Point
 */
export function mapSvgToCanvas(
  svgX: number,
  svgY: number,
  viewport: { zoom: number; panX: number; panY: number }
): Point {
  const canvasX = (svgX - viewport.panX) / viewport.zoom;
  const canvasY = (svgY - viewport.panY) / viewport.zoom;

  return {
    x: formatToPrecision(canvasX, PATH_DECIMAL_PRECISION),
    y: formatToPrecision(canvasY, PATH_DECIMAL_PRECISION)
  };
}