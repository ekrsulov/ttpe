import type { Point, CanvasElement } from '../../types';
import type { Bounds } from '../../utils/boundsUtils';
import type { SnapInfo } from './slice';

export interface SnapPoint {
  point: Point;
  type: SnapInfo['type'];
  elementId?: string;
}

/**
 * Calculate distance between two points in screen space
 */
export function screenDistance(p1: Point, p2: Point, zoom: number): number {
  const dx = (p2.x - p1.x) * zoom;
  const dy = (p2.y - p1.y) * zoom;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find the closest snap point from an element's bounding box
 */
export function findBBoxSnapPoint(
  point: Point,
  bounds: Bounds,
  elementId: string,
  threshold: number,
  zoom: number
): SnapInfo | null {
  const { minX, minY, maxX, maxY } = bounds;

  // Calculate all bbox points
  const bboxPoints: Array<{ point: Point; type: SnapInfo['type'] }> = [
    // Corners
    { point: { x: minX, y: minY }, type: 'bbox-corner' },
    { point: { x: maxX, y: minY }, type: 'bbox-corner' },
    { point: { x: maxX, y: maxY }, type: 'bbox-corner' },
    { point: { x: minX, y: maxY }, type: 'bbox-corner' },
    // Midpoints
    { point: { x: (minX + maxX) / 2, y: minY }, type: 'midpoint' },
    { point: { x: maxX, y: (minY + maxY) / 2 }, type: 'midpoint' },
    { point: { x: (minX + maxX) / 2, y: maxY }, type: 'midpoint' },
    { point: { x: minX, y: (minY + maxY) / 2 }, type: 'midpoint' },
    // Center
    { point: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, type: 'bbox-center' },
  ];

  // Find the closest point within threshold
  let closestPoint: SnapInfo | null = null;
  let closestDistance = Infinity;

  for (const { point: snapPoint, type } of bboxPoints) {
    const dist = screenDistance(point, snapPoint, zoom);
    if (dist < threshold && dist < closestDistance) {
      closestDistance = dist;
      closestPoint = {
        point: snapPoint,
        type,
        elementId,
      };
    }
  }

  return closestPoint;
}

/**
 * Find snap points from path anchor points
 */
export function findAnchorSnapPoint(
  point: Point,
  element: CanvasElement,
  threshold: number,
  zoom: number
): SnapInfo | null {
  if (element.type !== 'path') return null;

  const pathData = element.data;
  if (!pathData?.subPaths) return null;

  let closestPoint: SnapInfo | null = null;
  let closestDistance = Infinity;

  // Check all commands for anchor points
  for (const subPath of pathData.subPaths) {
    for (const command of subPath) {
      // M, L, and C commands have anchor points at their position
      if (command.type === 'M' || command.type === 'L' || command.type === 'C') {
        const snapPoint = command.position;
        const dist = screenDistance(point, snapPoint, zoom);

        if (dist < threshold && dist < closestDistance) {
          closestDistance = dist;
          closestPoint = {
            point: snapPoint,
            type: 'anchor',
            elementId: element.id,
          };
        }
      }
    }
  }

  return closestPoint;
}

/**
 * Find the closest point on a line segment
 */
function closestPointOnSegment(point: Point, start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return start;

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));

  return {
    x: start.x + t * dx,
    y: start.y + t * dy,
  };
}

/**
 * Find snap points along path edges
 */
export function findEdgeSnapPoint(
  point: Point,
  element: CanvasElement,
  threshold: number,
  zoom: number
): SnapInfo | null {
  if (element.type !== 'path') return null;

  const pathData = element.data;
  if (!pathData?.subPaths) return null;

  let closestPoint: SnapInfo | null = null;
  let closestDistance = Infinity;

  // Check all line segments
  for (const subPath of pathData.subPaths) {
    let currentPoint: Point | null = null;

    for (const command of subPath) {
      if (command.type === 'M') {
        currentPoint = command.position;
      } else if (command.type === 'L' && currentPoint) {
        // Find closest point on this line segment
        const snapPoint = closestPointOnSegment(point, currentPoint, command.position);
        const dist = screenDistance(point, snapPoint, zoom);

        if (dist < threshold && dist < closestDistance) {
          closestDistance = dist;
          closestPoint = {
            point: snapPoint,
            type: 'edge',
            elementId: element.id,
          };
        }

        currentPoint = command.position;
      } else if (command.type === 'C' && currentPoint) {
        // For curves, approximate with multiple segments
        const steps = 10;
        let prevPoint = currentPoint;

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const t1 = 1 - t;

          // Cubic Bezier formula
          const curvePoint = {
            x: t1 * t1 * t1 * currentPoint.x +
               3 * t1 * t1 * t * command.controlPoint1.x +
               3 * t1 * t * t * command.controlPoint2.x +
               t * t * t * command.position.x,
            y: t1 * t1 * t1 * currentPoint.y +
               3 * t1 * t1 * t * command.controlPoint1.y +
               3 * t1 * t * t * command.controlPoint2.y +
               t * t * t * command.position.y,
          };

          const snapPoint = closestPointOnSegment(point, prevPoint, curvePoint);
          const dist = screenDistance(point, snapPoint, zoom);

          if (dist < threshold && dist < closestDistance) {
            closestDistance = dist;
            closestPoint = {
              point: snapPoint,
              type: 'edge',
              elementId: element.id,
            };
          }

          prevPoint = curvePoint;
        }

        currentPoint = command.position;
      }
    }
  }

  return closestPoint;
}

/**
 * Find all possible snap points for a given cursor position
 */
export function findSnapPoint(
  point: Point,
  elements: CanvasElement[],
  getElementBounds: (element: CanvasElement) => Bounds | null,
  threshold: number,
  zoom: number,
  options: {
    snapToAnchors?: boolean;
    snapToEdges?: boolean;
    snapToBBox?: boolean;
  } = {}
): SnapInfo | null {
  const { snapToAnchors = true, snapToEdges = true, snapToBBox = true } = options;

  let closestSnap: SnapInfo | null = null;
  let closestDistance = Infinity;

  for (const element of elements) {
    // Try anchor points
    if (snapToAnchors) {
      const anchorSnap = findAnchorSnapPoint(point, element, threshold, zoom);
      if (anchorSnap) {
        const dist = screenDistance(point, anchorSnap.point, zoom);
        if (dist < closestDistance) {
          closestDistance = dist;
          closestSnap = anchorSnap;
        }
      }
    }

    // Try bbox points
    if (snapToBBox) {
      const bounds = getElementBounds(element);
      if (bounds) {
        const bboxSnap = findBBoxSnapPoint(point, bounds, element.id, threshold, zoom);
        if (bboxSnap) {
          const dist = screenDistance(point, bboxSnap.point, zoom);
          if (dist < closestDistance) {
            closestDistance = dist;
            closestSnap = bboxSnap;
          }
        }
      }
    }

    // Try edges (lower priority)
    if (snapToEdges && closestDistance > threshold / 2) {
      const edgeSnap = findEdgeSnapPoint(point, element, threshold, zoom);
      if (edgeSnap) {
        const dist = screenDistance(point, edgeSnap.point, zoom);
        if (dist < closestDistance) {
          closestDistance = dist;
          closestSnap = edgeSnap;
        }
      }
    }
  }

  return closestSnap;
}

/**
 * Extract all snap points from all elements for visualization
 * This is meant to be called once and cached when entering measure mode
 */
export function getAllSnapPoints(
  elements: CanvasElement[],
  getElementBounds: (element: CanvasElement) => Bounds | null
): SnapPoint[] {
  const allPoints: SnapPoint[] = [];

  for (const element of elements) {
    // Get anchor points from path
    if (element.type === 'path') {
      const pathData = element.data;
      if (pathData?.subPaths) {
        for (const subPath of pathData.subPaths) {
          for (const command of subPath) {
            if (command.type === 'M' || command.type === 'L' || command.type === 'C') {
              allPoints.push({
                point: command.position,
                type: 'anchor',
                elementId: element.id,
              });
            }
          }
        }
      }
    }

    // Get bbox points
    const bounds = getElementBounds(element);
    if (bounds) {
      const { minX, minY, maxX, maxY } = bounds;

      // Corners
      allPoints.push(
        { point: { x: minX, y: minY }, type: 'bbox-corner', elementId: element.id },
        { point: { x: maxX, y: minY }, type: 'bbox-corner', elementId: element.id },
        { point: { x: maxX, y: maxY }, type: 'bbox-corner', elementId: element.id },
        { point: { x: minX, y: maxY }, type: 'bbox-corner', elementId: element.id }
      );

      // Midpoints
      allPoints.push(
        { point: { x: (minX + maxX) / 2, y: minY }, type: 'midpoint', elementId: element.id },
        { point: { x: maxX, y: (minY + maxY) / 2 }, type: 'midpoint', elementId: element.id },
        { point: { x: (minX + maxX) / 2, y: maxY }, type: 'midpoint', elementId: element.id },
        { point: { x: minX, y: (minY + maxY) / 2 }, type: 'midpoint', elementId: element.id }
      );

      // Center
      allPoints.push({
        point: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
        type: 'bbox-center',
        elementId: element.id,
      });
    }
  }

  return allPoints;
}

