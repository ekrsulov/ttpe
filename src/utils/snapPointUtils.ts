import type { Point, CanvasElement, Command } from '../types';
import type { Bounds } from './boundsUtils';

/**
 * Unified snap point type definition
 */
export type SnapPointType = 
  | 'anchor'           // Path anchor points (M, L, C endpoints)
  | 'midpoint'         // Midpoints of lines, curves, or bbox edges
  | 'edge'             // Closest point on path edges (lines and curves)
  | 'bbox-corner'      // Corners of bounding boxes
  | 'bbox-center'      // Center of bounding boxes
  | 'intersection';    // Intersection between line segments

/**
 * Snap point information
 */
export interface SnapPoint {
  point: Point;
  type: SnapPointType;
  elementId?: string;
  metadata?: {
    commandIndex?: number;
    pointIndex?: number;
  };
}

/**
 * Options for snap point detection
 */
export interface SnapPointOptions {
  snapToAnchors?: boolean;
  snapToMidpoints?: boolean;
  snapToEdges?: boolean;
  snapToBBoxCorners?: boolean;
  snapToBBoxCenter?: boolean;
  snapToIntersections?: boolean;
}

/**
 * Calculate Euclidean distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
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
 * Calculate midpoint between two points
 */
export function midpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Get the endpoint of a command
 */
function getCommandEndpoint(command: Command): Point | null {
  if (command.type === 'M' || command.type === 'L' || command.type === 'C') {
    return command.position;
  }
  return null;
}

/**
 * Calculate a point on a cubic Bezier curve at parameter t
 */
function bezierPoint(start: Point, cp1: Point, cp2: Point, end: Point, t: number): Point {
  const t1 = 1 - t;
  return {
    x: t1 * t1 * t1 * start.x +
       3 * t1 * t1 * t * cp1.x +
       3 * t1 * t * t * cp2.x +
       t * t * t * end.x,
    y: t1 * t1 * t1 * start.y +
       3 * t1 * t1 * t * cp1.y +
       3 * t1 * t * t * cp2.y +
       t * t * t * end.y,
  };
}

/**
 * Find the closest point on a line segment to a given point
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
 * Find intersection point between two line segments (if any)
 * Returns null if lines don't intersect or are parallel
 */
function lineSegmentIntersection(
  p1: Point, p2: Point, // First line segment
  p3: Point, p4: Point  // Second line segment
): Point | null {
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const x4 = p4.x, y4 = p4.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  
  // Lines are parallel
  if (Math.abs(denom) < 1e-10) {
    return null;
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  // Check if intersection is within both segments
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }

  return null;
}

/**
 * Extract line segments from a path element
 */
function extractLineSegments(element: CanvasElement): Array<{ start: Point; end: Point }> {
  if (element.type !== 'path' || !element.data?.subPaths) return [];
  
  const segments: Array<{ start: Point; end: Point }> = [];
  let currentPoint: Point | null = null;
  let startPoint: Point | null = null;
  
  for (const subPath of element.data.subPaths) {
    for (const command of subPath) {
      const endpoint = getCommandEndpoint(command);
      
      if (command.type === 'M') {
        currentPoint = endpoint;
        if (!startPoint) startPoint = endpoint;
      } else if (command.type === 'L' && currentPoint && endpoint) {
        segments.push({ start: currentPoint, end: endpoint });
        currentPoint = endpoint;
      } else if (command.type === 'Z' && currentPoint && startPoint) {
        // Close the path
        segments.push({ start: currentPoint, end: startPoint });
        currentPoint = startPoint;
      } else if (endpoint) {
        currentPoint = endpoint;
      }
    }
  }
  
  return segments;
}

/**
 * Extract anchor points from a path element
 */
export function extractAnchorPoints(element: CanvasElement): SnapPoint[] {
  if (element.type !== 'path' || !element.data?.subPaths) return [];
  
  const points: SnapPoint[] = [];
  
  for (const subPath of element.data.subPaths) {
    for (let commandIndex = 0; commandIndex < subPath.length; commandIndex++) {
      const command = subPath[commandIndex];
      
      // M, L, and C commands have anchor points at their position
      if (command.type === 'M' || command.type === 'L' || command.type === 'C') {
        points.push({
          point: command.position,
          type: 'anchor',
          elementId: element.id,
          metadata: {
            commandIndex,
            pointIndex: 0,
          },
        });
      }
    }
  }
  
  return points;
}

/**
 * Extract midpoints from lines and curves in a path element
 */
export function extractMidpoints(element: CanvasElement): SnapPoint[] {
  if (element.type !== 'path' || !element.data?.subPaths) return [];
  
  const points: SnapPoint[] = [];
  let currentPoint: Point | null = null;
  let startPoint: Point | null = null;
  
  for (const subPath of element.data.subPaths) {
    for (let commandIndex = 0; commandIndex < subPath.length; commandIndex++) {
      const command = subPath[commandIndex];
      const endpoint = getCommandEndpoint(command);
      
      if (command.type === 'M') {
        currentPoint = endpoint;
        if (!startPoint) startPoint = endpoint;
      } else if (command.type === 'L' && currentPoint && endpoint) {
        // Midpoint of line segment
        const mid = midpoint(currentPoint, endpoint);
        points.push({
          point: mid,
          type: 'midpoint',
          elementId: element.id,
          metadata: { commandIndex },
        });
        currentPoint = endpoint;
      } else if (command.type === 'C' && currentPoint && endpoint) {
        // Midpoint of cubic Bezier curve at t=0.5
        const c = command as Extract<Command, { type: 'C' }>;
        const mid = bezierPoint(currentPoint, c.controlPoint1, c.controlPoint2, c.position, 0.5);
        points.push({
          point: mid,
          type: 'midpoint',
          elementId: element.id,
          metadata: { commandIndex },
        });
        currentPoint = endpoint;
      } else if (command.type === 'Z' && currentPoint && startPoint) {
        // Midpoint of closing segment
        const mid = midpoint(currentPoint, startPoint);
        points.push({
          point: mid,
          type: 'midpoint',
          elementId: element.id,
          metadata: { commandIndex },
        });
        currentPoint = startPoint;
      } else if (endpoint) {
        currentPoint = endpoint;
      }
    }
  }
  
  return points;
}

/**
 * Extract bounding box snap points (corners and center)
 */
export function extractBBoxPoints(
  element: CanvasElement,
  bounds: Bounds,
  options: { includeCorners?: boolean; includeCenter?: boolean; includeMidpoints?: boolean } = {}
): SnapPoint[] {
  const { 
    includeCorners = true, 
    includeCenter = true,
    includeMidpoints = true 
  } = options;
  
  const points: SnapPoint[] = [];
  const { minX, minY, maxX, maxY } = bounds;
  
  if (includeCorners) {
    // Four corners
    points.push(
      { point: { x: minX, y: minY }, type: 'bbox-corner', elementId: element.id },
      { point: { x: maxX, y: minY }, type: 'bbox-corner', elementId: element.id },
      { point: { x: maxX, y: maxY }, type: 'bbox-corner', elementId: element.id },
      { point: { x: minX, y: maxY }, type: 'bbox-corner', elementId: element.id }
    );
  }
  
  if (includeMidpoints) {
    // Four edge midpoints
    points.push(
      { point: { x: (minX + maxX) / 2, y: minY }, type: 'midpoint', elementId: element.id },
      { point: { x: maxX, y: (minY + maxY) / 2 }, type: 'midpoint', elementId: element.id },
      { point: { x: (minX + maxX) / 2, y: maxY }, type: 'midpoint', elementId: element.id },
      { point: { x: minX, y: (minY + maxY) / 2 }, type: 'midpoint', elementId: element.id }
    );
  }
  
  if (includeCenter) {
    // Center point
    points.push({
      point: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
      type: 'bbox-center',
      elementId: element.id,
    });
  }
  
  return points;
}

/**
 * Find closest point on path edges to a given position
 */
export function findEdgeSnapPoint(
  position: Point,
  element: CanvasElement,
  threshold: number,
  zoom: number
): SnapPoint | null {
  if (element.type !== 'path' || !element.data?.subPaths) return null;

  let closestPoint: SnapPoint | null = null;
  let closestDistance = threshold;

  let currentPoint: Point | null = null;

  for (const subPath of element.data.subPaths) {
    for (const command of subPath) {
      const endpoint = getCommandEndpoint(command);

      if (command.type === 'M') {
        currentPoint = endpoint;
      } else if (command.type === 'L' && currentPoint && endpoint) {
        // Find closest point on line segment
        const snapPoint = closestPointOnSegment(position, currentPoint, endpoint);
        const dist = screenDistance(position, snapPoint, zoom);

        if (dist < closestDistance) {
          closestDistance = dist;
          closestPoint = {
            point: snapPoint,
            type: 'edge',
            elementId: element.id,
          };
        }

        currentPoint = endpoint;
      } else if (command.type === 'C' && currentPoint && endpoint) {
        // For curves, approximate with multiple segments
        const c = command as Extract<Command, { type: 'C' }>;
        const steps = 10;
        let prevPoint = currentPoint;

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const curvePoint = bezierPoint(currentPoint, c.controlPoint1, c.controlPoint2, c.position, t);

          const snapPoint = closestPointOnSegment(position, prevPoint, curvePoint);
          const dist = screenDistance(position, snapPoint, zoom);

          if (dist < closestDistance) {
            closestDistance = dist;
            closestPoint = {
              point: snapPoint,
              type: 'edge',
              elementId: element.id,
            };
          }

          prevPoint = curvePoint;
        }

        currentPoint = endpoint;
      } else if (endpoint) {
        currentPoint = endpoint;
      }
    }
  }

  return closestPoint;
}

/**
 * Find all intersection points between line segments of different elements
 */
export function findIntersections(elements: CanvasElement[]): SnapPoint[] {
  const intersections: SnapPoint[] = [];
  const seen = new Set<string>(); // To avoid duplicates
  
  // Compare each pair of elements
  for (let i = 0; i < elements.length; i++) {
    const segments1 = extractLineSegments(elements[i]);
    
    for (let j = i + 1; j < elements.length; j++) {
      const segments2 = extractLineSegments(elements[j]);
      
      // Check each segment pair
      for (const seg1 of segments1) {
        for (const seg2 of segments2) {
          const intersection = lineSegmentIntersection(
            seg1.start, seg1.end,
            seg2.start, seg2.end
          );
          
          if (intersection) {
            // Create unique key to avoid duplicates
            const key = `${intersection.x.toFixed(6)},${intersection.y.toFixed(6)}`;
            if (!seen.has(key)) {
              seen.add(key);
              intersections.push({
                point: intersection,
                type: 'intersection',
                elementId: elements[i].id,
              });
            }
          }
        }
      }
    }
  }
  
  return intersections;
}

/**
 * Get all snap points from elements based on options
 * Note: Edge snap is NOT included here as it's computed on-demand per position
 */
export function getAllSnapPoints(
  elements: CanvasElement[],
  getElementBounds: (element: CanvasElement) => Bounds | null,
  options: SnapPointOptions = {}
): SnapPoint[] {
  const {
    snapToAnchors = true,
    snapToMidpoints = true,
    snapToBBoxCorners = true,
    snapToBBoxCenter = true,
    snapToIntersections = true,
  } = options;
  
  const allPoints: SnapPoint[] = [];
  
  for (const element of elements) {
    // Extract anchor points
    if (snapToAnchors) {
      allPoints.push(...extractAnchorPoints(element));
    }
    
    // Extract midpoints from curves and lines
    if (snapToMidpoints) {
      allPoints.push(...extractMidpoints(element));
    }
    
    // Extract bbox points
    if (snapToBBoxCorners || snapToBBoxCenter || snapToMidpoints) {
      const bounds = getElementBounds(element);
      if (bounds) {
        allPoints.push(
          ...extractBBoxPoints(element, bounds, {
            includeCorners: snapToBBoxCorners,
            includeCenter: snapToBBoxCenter,
            includeMidpoints: snapToMidpoints,
          })
        );
      }
    }
  }
  
  // Find intersections between elements
  if (snapToIntersections && elements.length > 1) {
    allPoints.push(...findIntersections(elements));
  }
  
  return allPoints;
}

/**
 * Find the closest snap point to a given position within a threshold
 */
export function findClosestSnapPoint(
  position: Point,
  snapPoints: SnapPoint[],
  threshold: number,
  zoom: number
): SnapPoint | null {
  let closestPoint: SnapPoint | null = null;
  let minDistance = threshold;
  
  for (const snapPoint of snapPoints) {
    const dist = screenDistance(position, snapPoint.point, zoom);
    
    if (dist < minDistance) {
      minDistance = dist;
      closestPoint = snapPoint;
    }
  }
  
  return closestPoint;
}

/**
 * Find snap point from cursor position
 */
export function findSnapPoint(
  point: Point,
  elements: CanvasElement[],
  getElementBounds: (element: CanvasElement) => Bounds | null,
  threshold: number,
  zoom: number,
  options: SnapPointOptions = {}
): SnapPoint | null {
  const { snapToEdges = false } = options;
  
  // Get all static snap points
  const allPoints = getAllSnapPoints(elements, getElementBounds, options);
  let closestSnap = findClosestSnapPoint(point, allPoints, threshold, zoom);
  let closestDistance = closestSnap ? screenDistance(point, closestSnap.point, zoom) : Infinity;
  
  // Check edge snap (dynamic, computed per element)
  if (snapToEdges) {
    for (const element of elements) {
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
 * Get human-readable label for snap point type
 */
export function getSnapPointLabel(type: SnapPointType): string {
  switch (type) {
    case 'anchor':
      return 'Anchor';
    case 'midpoint':
      return 'Midpoint';
    case 'edge':
      return 'Path';
    case 'bbox-corner':
      return 'Corner';
    case 'bbox-center':
      return 'Center';
    case 'intersection':
      return 'Intersection';
    default:
      return 'Snap';
  }
}
