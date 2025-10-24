import type { Command, Point } from '../types';
import { getCommandStartPoint } from './pathParserUtils';

/**
 * Calculate the closest point on a line segment to a given point
 */
function closestPointOnLineSegment(
  point: Point,
  start: Point,
  end: Point
): { closestPoint: Point; t: number; distance: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    // Start and end are the same point
    const distance = Math.sqrt(
      Math.pow(point.x - start.x, 2) + Math.pow(point.y - start.y, 2)
    );
    return { closestPoint: start, t: 0, distance };
  }

  // Calculate the parameter t for the projection
  let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]

  const closestPoint = {
    x: start.x + t * dx,
    y: start.y + t * dy,
  };

  const distance = Math.sqrt(
    Math.pow(point.x - closestPoint.x, 2) + Math.pow(point.y - closestPoint.y, 2)
  );

  return { closestPoint, t, distance };
}

/**
 * Calculate the closest point on a cubic bezier curve to a given point
 * Uses iterative approximation
 */
function closestPointOnCubicBezier(
  point: Point,
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  samples: number = 50
): { closestPoint: Point; t: number; distance: number } {
  let minDistance = Infinity;
  let bestT = 0;
  let bestPoint = p0;

  // Sample the curve at regular intervals
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const curvePoint = evaluateCubicBezier(t, p0, p1, p2, p3);
    const distance = Math.sqrt(
      Math.pow(point.x - curvePoint.x, 2) + Math.pow(point.y - curvePoint.y, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      bestT = t;
      bestPoint = curvePoint;
    }
  }

  // Refine the result using a few iterations of Newton's method
  const iterations = 5;
  let t = bestT;
  for (let i = 0; i < iterations; i++) {
    const curvePoint = evaluateCubicBezier(t, p0, p1, p2, p3);
    const derivative = evaluateCubicBezierDerivative(t, p0, p1, p2, p3);

    const dx = curvePoint.x - point.x;
    const dy = curvePoint.y - point.y;

    const numerator = dx * derivative.x + dy * derivative.y;
    const denominator = derivative.x * derivative.x + derivative.y * derivative.y;

    if (Math.abs(denominator) < 0.0001) break;

    const dt = -numerator / denominator;
    t = Math.max(0, Math.min(1, t + dt));

    if (Math.abs(dt) < 0.0001) break;
  }

  bestPoint = evaluateCubicBezier(t, p0, p1, p2, p3);
  minDistance = Math.sqrt(
    Math.pow(point.x - bestPoint.x, 2) + Math.pow(point.y - bestPoint.y, 2)
  );

  return { closestPoint: bestPoint, t, distance: minDistance };
}

/**
 * Evaluate a cubic bezier curve at parameter t
 */
function evaluateCubicBezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

/**
 * Evaluate the derivative of a cubic bezier curve at parameter t
 */
function evaluateCubicBezierDerivative(
  t: number,
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point
): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
    y: 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y),
  };
}

/**
 * Check if a point is near an existing control point
 */
function isNearExistingPoint(
  point: Point,
  commands: Command[],
  threshold: number = 10
): boolean {
  for (const command of commands) {
    if (command.type === 'M' || command.type === 'L') {
      if (command.position) {
        const distance = Math.sqrt(
          Math.pow(point.x - command.position.x, 2) +
          Math.pow(point.y - command.position.y, 2)
        );
        if (distance < threshold) return true;
      }
    } else if (command.type === 'C') {
      // Check main position
      if (command.position) {
        const distance = Math.sqrt(
          Math.pow(point.x - command.position.x, 2) +
          Math.pow(point.y - command.position.y, 2)
        );
        if (distance < threshold) return true;
      }
      // Check control points
      if (command.controlPoint1) {
        const distance = Math.sqrt(
          Math.pow(point.x - command.controlPoint1.x, 2) +
          Math.pow(point.y - command.controlPoint1.y, 2)
        );
        if (distance < threshold) return true;
      }
      if (command.controlPoint2) {
        const distance = Math.sqrt(
          Math.pow(point.x - command.controlPoint2.x, 2) +
          Math.pow(point.y - command.controlPoint2.y, 2)
        );
        if (distance < threshold) return true;
      }
    }
  }
  return false;
}

/**
 * Find the closest segment on a path to a given point
 * Returns null if no segment is within the threshold or if near an existing point
 */
export function findClosestPathSegment(
  point: Point,
  commands: Command[],
  threshold: number = 15,
  existingPointThreshold: number = 10
): { commandIndex: number; closestPoint: Point; t: number; distance: number } | null {
  // First check if the point is near an existing point
  if (isNearExistingPoint(point, commands, existingPointThreshold)) {
    return null;
  }

  let closestResult: { commandIndex: number; closestPoint: Point; t: number; distance: number } | null = null;
  let minDistance = threshold;

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];

    // Skip M and Z commands as they don't define segments to add points to
    if (command.type === 'M' || command.type === 'Z') continue;

    const startPoint = getCommandStartPoint(commands, i);
    if (!startPoint) continue;

    if (command.type === 'L' && command.position) {
      // Handle line segment
      const result = closestPointOnLineSegment(point, startPoint, command.position);
      if (result.distance < minDistance) {
        minDistance = result.distance;
        closestResult = {
          commandIndex: i,
          closestPoint: result.closestPoint,
          t: result.t,
          distance: result.distance,
        };
      }
    } else if (command.type === 'C' && command.controlPoint1 && command.controlPoint2 && command.position) {
      // Handle cubic bezier curve
      const result = closestPointOnCubicBezier(
        point,
        startPoint,
        command.controlPoint1,
        command.controlPoint2,
        command.position
      );
      if (result.distance < minDistance) {
        minDistance = result.distance;
        closestResult = {
          commandIndex: i,
          closestPoint: result.closestPoint,
          t: result.t,
          distance: result.distance,
        };
      }
    }
  }

  return closestResult;
}
