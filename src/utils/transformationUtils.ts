import type { PathData, Point } from '../types';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from './index';

/**
 * Parses an SVG path string and extracts coordinate points for transformation
 */
export function parsePathCommands(d: string): Array<{ command: string; points: Point[] }> {
  const commands: Array<{ command: string; points: Point[] }> = [];
  
  // Remove commas and extra spaces, split by command letters
  const cleaned = d.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const segments = cleaned.split(/(?=[MLHVCSQTAZ])/i);
  
  for (const segment of segments) {
    if (!segment.trim()) continue;
    
    const command = segment[0];
    const coordsStr = segment.slice(1).trim();
    
    if (!coordsStr) {
      // Commands like Z don't have coordinates
      commands.push({ command, points: [] });
      continue;
    }
    
    const coords = coordsStr.split(/\s+/).map(Number).filter(n => !isNaN(n));
    const points: Point[] = [];
    
    // Group coordinates into points based on command type
    switch (command.toUpperCase()) {
      case 'M':
      case 'L':
      case 'T':
        for (let i = 0; i < coords.length; i += 2) {
          if (i + 1 < coords.length) {
            points.push({ x: coords[i], y: coords[i + 1] });
          }
        }
        break;
      case 'H':
        for (let i = 0; i < coords.length; i++) {
          points.push({ x: coords[i], y: 0 }); // Y will be ignored
        }
        break;
      case 'V':
        for (let i = 0; i < coords.length; i++) {
          points.push({ x: 0, y: coords[i] }); // X will be ignored
        }
        break;
      case 'C':
        for (let i = 0; i < coords.length; i += 6) {
          if (i + 5 < coords.length) {
            points.push(
              { x: coords[i], y: coords[i + 1] },
              { x: coords[i + 2], y: coords[i + 3] },
              { x: coords[i + 4], y: coords[i + 5] }
            );
          }
        }
        break;
      case 'S':
      case 'Q':
        for (let i = 0; i < coords.length; i += 4) {
          if (i + 3 < coords.length) {
            points.push(
              { x: coords[i], y: coords[i + 1] },
              { x: coords[i + 2], y: coords[i + 3] }
            );
          }
        }
        break;
      case 'A':
        for (let i = 0; i < coords.length; i += 7) {
          if (i + 6 < coords.length) {
            points.push(
              { x: coords[i], y: coords[i + 1] }, // rx, ry
              { x: coords[i + 2], y: 0 }, // x-axis-rotation (no y component)
              { x: coords[i + 3], y: coords[i + 4] }, // large-arc-flag, sweep-flag
              { x: coords[i + 5], y: coords[i + 6] } // end point
            );
          }
        }
        break;
    }
    
    commands.push({ command, points });
  }
  
  return commands;
}

/**
 * Transforms a point using scale and translation
 */
export function transformPoint(point: Point, scaleX: number, scaleY: number, originX: number, originY: number): Point {
  // Translate to origin, scale, translate back
  const translatedX = point.x - originX;
  const translatedY = point.y - originY;
  
  const scaledX = translatedX * scaleX;
  const scaledY = translatedY * scaleY;
  
  return {
    x: formatToPrecision(scaledX + originX, PATH_DECIMAL_PRECISION),
    y: formatToPrecision(scaledY + originY, PATH_DECIMAL_PRECISION)
  };
}

/**
 * Rotates a point around an origin by a given angle in degrees
 */
export function rotatePoint(point: Point, angleDegrees: number, originX: number, originY: number): Point {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  
  // Translate to origin
  const translatedX = point.x - originX;
  const translatedY = point.y - originY;
  
  // Rotate
  const rotatedX = translatedX * cos - translatedY * sin;
  const rotatedY = translatedX * sin + translatedY * cos;
  
  // Translate back
  return {
    x: formatToPrecision(rotatedX + originX, PATH_DECIMAL_PRECISION),
    y: formatToPrecision(rotatedY + originY, PATH_DECIMAL_PRECISION)
  };
}

/**
 * Rebuilds an SVG path string from parsed commands with transformed coordinates
 */
export function rebuildPathString(commands: Array<{ command: string; points: Point[] }>): string {
  let pathString = '';
  
  for (let i = 0; i < commands.length; i++) {
    const { command, points } = commands[i];
    if (i > 0) pathString += ' ';
    pathString += command;
    
    switch (command.toUpperCase()) {
      case 'M':
      case 'L':
      case 'T':
        for (const point of points) {
          pathString += ` ${formatToPrecision(point.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(point.y, PATH_DECIMAL_PRECISION)}`;
        }
        break;
      case 'H':
        for (const point of points) {
          pathString += ` ${formatToPrecision(point.x, PATH_DECIMAL_PRECISION)}`;
        }
        break;
      case 'V':
        for (const point of points) {
          pathString += ` ${formatToPrecision(point.y, PATH_DECIMAL_PRECISION)}`;
        }
        break;
      case 'C':
        for (let i = 0; i < points.length; i += 3) {
          if (i + 2 < points.length) {
            const separator = i > 0 ? ' C ' : '';
            pathString += `${separator}${formatToPrecision(points[i].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i].y, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i + 1].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i + 1].y, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i + 2].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i + 2].y, PATH_DECIMAL_PRECISION)}`;
          }
        }
        break;
      case 'S':
      case 'Q':
        for (let i = 0; i < points.length; i += 2) {
          if (i + 1 < points.length) {
            const separator = i > 0 ? ` ${command} ` : '';
            pathString += `${separator}${formatToPrecision(points[i].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i].y, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i + 1].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i + 1].y, PATH_DECIMAL_PRECISION)}`;
          }
        }
        break;
      case 'A':
        for (let i = 0; i < points.length; i += 4) {
          if (i + 3 < points.length) {
            // rx ry x-axis-rotation large-arc-flag sweep-flag x y
            const separator = i > 0 ? ' A ' : '';
            pathString += `${separator}${formatToPrecision(points[i].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i].y, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i + 1].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i + 2].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i + 2].y, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i + 3].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i + 3].y, PATH_DECIMAL_PRECISION)}`;
          }
        }
        break;
      case 'Z':
        // No coordinates for Z command
        break;
    }
  }
  
  return pathString;
}

/**
 * Applies scale transformation directly to a path by modifying its coordinates
 */
export function transformPathData(
  pathData: PathData, 
  scaleX: number, 
  scaleY: number, 
  originX: number, 
  originY: number,
  rotation: number = 0
): PathData {
  const commands = parsePathCommands(pathData.d);
  
  // Transform all coordinate points
  const transformedCommands = commands.map(({ command, points }) => ({
    command,
    points: points.map(point => {
      let transformedPoint = point;
      
      // Handle special cases for H, V, and A commands
      if (command.toUpperCase() === 'H') {
        transformedPoint = { x: point.x, y: 0 };
      } else if (command.toUpperCase() === 'V') {
        transformedPoint = { x: 0, y: point.y };
      } else if (command.toUpperCase() === 'A' && points.indexOf(point) < 2) {
        // For arc commands, the first two points are rx, ry which should be scaled but not translated
        return { x: formatToPrecision(point.x * scaleX, PATH_DECIMAL_PRECISION), y: formatToPrecision(point.y * scaleY, PATH_DECIMAL_PRECISION) };
      }
      
      // Apply scale and translation
      transformedPoint = transformPoint(transformedPoint, scaleX, scaleY, originX, originY);
      
      // Apply rotation if specified
      if (rotation !== 0) {
        transformedPoint = rotatePoint(transformedPoint, rotation, originX, originY);
      }
      
      return transformedPoint;
    })
  }));
  
  const newPathString = rebuildPathString(transformedCommands);
  
  return {
    ...pathData,
    d: newPathString,
    // Scale stroke width proportionally
    strokeWidth: formatToPrecision(pathData.strokeWidth * Math.min(scaleX, scaleY), PATH_DECIMAL_PRECISION),
    // Remove transform since we've applied it directly
    transform: undefined
  };
}