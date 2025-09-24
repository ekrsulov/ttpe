import { formatToPrecision, PATH_DECIMAL_PRECISION } from './index';
import type { Command, Point } from '../types';

/**
 * Transform a point by scaling and translation
 */
export function transformPoint(
  point: Point,
  scaleX: number,
  scaleY: number,
  originX: number,
  originY: number
): Point {
  return {
    x: formatToPrecision((point.x - originX) * scaleX + originX, PATH_DECIMAL_PRECISION),
    y: formatToPrecision((point.y - originY) * scaleY + originY, PATH_DECIMAL_PRECISION),
  };
}

/**
 * Rotate a point around a center
 */
export function rotatePoint(
  point: Point,
  rotation: number,
  centerX: number,
  centerY: number
): Point {
  const cos = Math.cos((rotation * Math.PI) / 180);
  const sin = Math.sin((rotation * Math.PI) / 180);

  const x = point.x - centerX;
  const y = point.y - centerY;

  return {
    x: formatToPrecision(x * cos - y * sin + centerX, PATH_DECIMAL_PRECISION),
    y: formatToPrecision(x * sin + y * cos + centerY, PATH_DECIMAL_PRECISION),
  };
}

/**
 * Transform a collection of commands with scaling, rotation and stroke width updates
 * This centralizes the logic that was duplicated across transformPathData, transformSubpathsData, and transformSingleSubpath
 */
export function transformCommands(
  commands: Command[],
  options: {
    scaleX: number;
    scaleY: number;
    originX: number;
    originY: number;
    rotation?: number;
    rotationCenterX?: number;
    rotationCenterY?: number;
  }
): Command[] {
  const {
    scaleX,
    scaleY,
    originX,
    originY,
    rotation = 0,
    rotationCenterX = originX,
    rotationCenterY = originY
  } = options;

  return commands.map(cmd => {
    const transformedCmd = { ...cmd };

    // Transform points based on command type
    if (cmd.type === 'M' || cmd.type === 'L') {
      let transformedPoint = { ...cmd.position };
      transformedPoint = transformPoint(transformedPoint, scaleX, scaleY, originX, originY);
      if (rotation !== 0) {
        transformedPoint = rotatePoint(transformedPoint, rotation, rotationCenterX, rotationCenterY);
      }
      (transformedCmd as { position: Point }).position = transformedPoint;
    } else if (cmd.type === 'C') {
      let cp1 = { ...cmd.controlPoint1 };
      let cp2 = { ...cmd.controlPoint2 };
      let pos = { ...cmd.position };

      cp1 = { ...cp1, ...transformPoint({ x: cp1.x, y: cp1.y }, scaleX, scaleY, originX, originY) };
      cp2 = { ...cp2, ...transformPoint({ x: cp2.x, y: cp2.y }, scaleX, scaleY, originX, originY) };
      pos = transformPoint(pos, scaleX, scaleY, originX, originY);

      if (rotation !== 0) {
        cp1 = { ...cp1, ...rotatePoint({ x: cp1.x, y: cp1.y }, rotation, rotationCenterX, rotationCenterY) };
        cp2 = { ...cp2, ...rotatePoint({ x: cp2.x, y: cp2.y }, rotation, rotationCenterX, rotationCenterY) };
        pos = rotatePoint(pos, rotation, rotationCenterX, rotationCenterY);
      }

      (transformedCmd as Command & { type: 'C' }).controlPoint1 = { ...cmd.controlPoint1, ...cp1 };
      (transformedCmd as Command & { type: 'C' }).controlPoint2 = { ...cmd.controlPoint2, ...cp2 };
      (transformedCmd as Command & { type: 'C' }).position = pos;
    }
    // Z command has no points to transform

    return transformedCmd;
  });
}

/**
 * Calculate new stroke width after scaling transformation
 */
export function calculateScaledStrokeWidth(
  originalStrokeWidth: number,
  scaleX: number,
  scaleY: number
): number {
  return formatToPrecision(
    originalStrokeWidth * Math.min(Math.abs(scaleX), Math.abs(scaleY)),
    PATH_DECIMAL_PRECISION
  );
}