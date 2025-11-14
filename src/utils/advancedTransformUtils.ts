import { formatToPrecision, PATH_DECIMAL_PRECISION } from './index';
import type { Command, Point } from '../types';

/**
 * Apply a 2D transformation matrix to a point
 */
function applyMatrix(point: Point, matrix: number[][]): Point {
  const x = matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2];
  const y = matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2];
  const w = matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2];
  
  return {
    x: formatToPrecision(x / w, PATH_DECIMAL_PRECISION),
    y: formatToPrecision(y / w, PATH_DECIMAL_PRECISION)
  };
}

/**
 * Create a perspective transformation matrix from four corner points
 * Based on the homography transformation
 */
export function createPerspectiveMatrix(
  srcCorners: { tl: Point; tr: Point; bl: Point; br: Point },
  dstCorners: { tl: Point; tr: Point; bl: Point; br: Point }
): number[][] {
  // This is a simplified perspective transform
  // For a full implementation, we'd need to solve a system of linear equations
  // For now, we'll use a basic approach that works for moderate perspective changes
  
  const srcTL = srcCorners.tl;
  const srcTR = srcCorners.tr;
  const srcBL = srcCorners.bl;
  
  const dstTL = dstCorners.tl;
  const dstTR = dstCorners.tr;
  const dstBL = dstCorners.bl;
  
  // Calculate transformation using bilinear interpolation approximation
  // This is a simplified version that works for small perspective changes
  const scaleX = (dstTR.x - dstTL.x) / (srcTR.x - srcTL.x);
  const scaleY = (dstBL.y - dstTL.y) / (srcBL.y - srcTL.y);
  const skewX = (dstTR.y - dstTL.y) / (srcTR.x - srcTL.x);
  const skewY = (dstBL.x - dstTL.x) / (srcBL.y - srcTL.y);
  
  return [
    [scaleX, skewY, dstTL.x - srcTL.x * scaleX - srcTL.y * skewY],
    [skewX, scaleY, dstTL.y - srcTL.x * skewX - srcTL.y * scaleY],
    [0, 0, 1]
  ];
}

/**
 * Apply distort transformation (free-form corner movement)
 */
export function applyDistortTransform(
  commands: Command[],
  originalBounds: { minX: number; minY: number; maxX: number; maxY: number },
  newCorners: { tl: Point; tr: Point; bl: Point; br: Point }
): Command[] {
  const srcCorners = {
    tl: { x: originalBounds.minX, y: originalBounds.minY },
    tr: { x: originalBounds.maxX, y: originalBounds.minY },
    bl: { x: originalBounds.minX, y: originalBounds.maxY },
    br: { x: originalBounds.maxX, y: originalBounds.maxY }
  };
  
  const matrix = createPerspectiveMatrix(srcCorners, newCorners);
  
  return commands.map(cmd => {
    if (cmd.type === 'Z') {
      return cmd;
    }
    
    if (cmd.type === 'M' || cmd.type === 'L') {
      return {
        ...cmd,
        position: applyMatrix(cmd.position, matrix)
      };
    }
    
    if (cmd.type === 'C') {
      const transformedCP1 = applyMatrix(cmd.controlPoint1, matrix);
      const transformedCP2 = applyMatrix(cmd.controlPoint2, matrix);
      
      return {
        ...cmd,
        controlPoint1: {
          ...cmd.controlPoint1,
          x: transformedCP1.x,
          y: transformedCP1.y
        },
        controlPoint2: {
          ...cmd.controlPoint2,
          x: transformedCP2.x,
          y: transformedCP2.y
        },
        position: applyMatrix(cmd.position, matrix)
      };
    }
    
    return cmd;
  });
}

/**
 * Apply skew transformation along X axis
 */
export function applySkewXTransform(
  commands: Command[],
  angle: number,
  originY: number
): Command[] {
  const tanAngle = Math.tan((angle * Math.PI) / 180);
  
  const skewPoint = (point: Point): Point => {
    const dy = point.y - originY;
    return {
      x: formatToPrecision(point.x + dy * tanAngle, PATH_DECIMAL_PRECISION),
      y: point.y
    };
  };
  
  return commands.map(cmd => {
    if (cmd.type === 'Z') {
      return cmd;
    }
    
    if (cmd.type === 'M' || cmd.type === 'L') {
      return {
        ...cmd,
        position: skewPoint(cmd.position)
      };
    }
    
    if (cmd.type === 'C') {
      return {
        ...cmd,
        controlPoint1: {
          ...cmd.controlPoint1,
          ...skewPoint(cmd.controlPoint1)
        },
        controlPoint2: {
          ...cmd.controlPoint2,
          ...skewPoint(cmd.controlPoint2)
        },
        position: skewPoint(cmd.position)
      };
    }
    
    return cmd;
  });
}

/**
 * Apply skew transformation along Y axis
 */
export function applySkewYTransform(
  commands: Command[],
  angle: number,
  originX: number
): Command[] {
  const tanAngle = Math.tan((angle * Math.PI) / 180);
  
  const skewPoint = (point: Point): Point => {
    const dx = point.x - originX;
    return {
      x: point.x,
      y: formatToPrecision(point.y + dx * tanAngle, PATH_DECIMAL_PRECISION)
    };
  };
  
  return commands.map(cmd => {
    if (cmd.type === 'Z') {
      return cmd;
    }
    
    if (cmd.type === 'M' || cmd.type === 'L') {
      return {
        ...cmd,
        position: skewPoint(cmd.position)
      };
    }
    
    if (cmd.type === 'C') {
      return {
        ...cmd,
        controlPoint1: {
          ...cmd.controlPoint1,
          ...skewPoint(cmd.controlPoint1)
        },
        controlPoint2: {
          ...cmd.controlPoint2,
          ...skewPoint(cmd.controlPoint2)
        },
        position: skewPoint(cmd.position)
      };
    }
    
    return cmd;
  });
}

/**
 * Calculate skew angle from edge movement
 */
export function calculateSkewAngleFromDelta(
  delta: number,
  perpDistance: number
): number {
  if (perpDistance === 0) return 0;
  return Math.atan(delta / perpDistance) * (180 / Math.PI);
}
