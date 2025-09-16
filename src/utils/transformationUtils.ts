import type { PathData, TextData, Point } from '../types';

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
    x: scaledX + originX,
    y: scaledY + originY
  };
}

/**
 * Rebuilds an SVG path string from parsed commands with transformed coordinates
 */
export function rebuildPathString(commands: Array<{ command: string; points: Point[] }>): string {
  let pathString = '';
  
  for (const { command, points } of commands) {
    pathString += command;
    
    switch (command.toUpperCase()) {
      case 'M':
      case 'L':
      case 'T':
        for (const point of points) {
          pathString += ` ${point.x} ${point.y}`;
        }
        break;
      case 'H':
        for (const point of points) {
          pathString += ` ${point.x}`;
        }
        break;
      case 'V':
        for (const point of points) {
          pathString += ` ${point.y}`;
        }
        break;
      case 'C':
        for (let i = 0; i < points.length; i += 3) {
          if (i + 2 < points.length) {
            pathString += ` ${points[i].x} ${points[i].y} ${points[i + 1].x} ${points[i + 1].y} ${points[i + 2].x} ${points[i + 2].y}`;
          }
        }
        break;
      case 'S':
      case 'Q':
        for (let i = 0; i < points.length; i += 2) {
          if (i + 1 < points.length) {
            pathString += ` ${points[i].x} ${points[i].y} ${points[i + 1].x} ${points[i + 1].y}`;
          }
        }
        break;
      case 'A':
        for (let i = 0; i < points.length; i += 4) {
          if (i + 3 < points.length) {
            // rx ry x-axis-rotation large-arc-flag sweep-flag x y
            pathString += ` ${points[i].x} ${points[i].y} ${points[i + 1].x} ${points[i + 2].x} ${points[i + 2].y} ${points[i + 3].x} ${points[i + 3].y}`;
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
  originY: number
): PathData {
  const commands = parsePathCommands(pathData.d);
  
  // Transform all coordinate points
  const transformedCommands = commands.map(({ command, points }) => ({
    command,
    points: points.map(point => {
      // Handle special cases for H, V, and A commands
      if (command.toUpperCase() === 'H') {
        return { x: transformPoint({ x: point.x, y: 0 }, scaleX, scaleY, originX, originY).x, y: 0 };
      } else if (command.toUpperCase() === 'V') {
        return { x: 0, y: transformPoint({ x: 0, y: point.y }, scaleX, scaleY, originX, originY).y };
      } else if (command.toUpperCase() === 'A' && points.indexOf(point) < 2) {
        // For arc commands, the first two points are rx, ry which should be scaled but not translated
        return { x: point.x * scaleX, y: point.y * scaleY };
      } else {
        return transformPoint(point, scaleX, scaleY, originX, originY);
      }
    })
  }));
  
  const newPathString = rebuildPathString(transformedCommands);
  
  return {
    ...pathData,
    d: newPathString,
    // Scale stroke width proportionally
    strokeWidth: pathData.strokeWidth * Math.min(scaleX, scaleY),
    // Remove transform since we've applied it directly
    transform: undefined
  };
}

/**
 * Applies scale transformation directly to text by adjusting font size and position
 */
export function transformTextData(
  textData: TextData,
  scaleX: number,
  scaleY: number,
  originX: number,
  originY: number
): TextData {
  // Transform the text position
  const transformedPosition = transformPoint(
    { x: textData.x, y: textData.y },
    scaleX,
    scaleY,
    originX,
    originY
  );
  
  // Scale font size (use minimum scale to maintain aspect ratio)
  const scaleFactor = Math.min(scaleX, scaleY);
  
  return {
    ...textData,
    x: transformedPosition.x,
    y: transformedPosition.y,
    fontSize: textData.fontSize * scaleFactor,
    // Remove transform since we've applied it directly
    transform: undefined
  };
}