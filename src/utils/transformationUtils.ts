import type { PathData, Point } from '../types';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from './index';
import { parsePathD, extractSubpaths, updatePathD } from './pathParserUtils';
import { measurePath } from './measurementUtils';

/**
 * Parses an SVG path string and extracts coordinate points for transformation
 */
export function parsePathCommands(d: string): Array<{ command: string; points: Point[] }> {
  const commands: Array<{ command: string; points: Point[] }> = [];
  
  // Remove commas and extra spaces, split by command letters
  const cleaned = d.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const segments = cleaned.split(/(?=[MLCZ])/i);
  
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
        for (let i = 0; i < coords.length; i += 2) {
          if (i + 1 < coords.length) {
            points.push({ x: coords[i], y: coords[i + 1] });
          }
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
    pathString += command + ' ';
    
    switch (command.toUpperCase()) {
      case 'M':
      case 'L':
        for (const point of points) {
          pathString += ` ${formatToPrecision(point.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(point.y, PATH_DECIMAL_PRECISION)}`;
        }
        break;
      case 'C':
        for (let i = 0; i < points.length; i += 3) {
          if (i + 2 < points.length) {
            if (i > 0) pathString += ' ';
            pathString += `${formatToPrecision(points[i].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i].y, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i + 1].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i + 1].y, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i + 2].x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(points[i + 2].y, PATH_DECIMAL_PRECISION)}`;
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

/**
 * Applies scale transformation to ONLY selected subpaths - same calculation logic as transformPathData
 */
export function transformSubpathsData(
  pathData: PathData, 
  scaleX: number, 
  scaleY: number, 
  originX: number, 
  originY: number,
  rotation: number = 0,
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }> = []
): PathData {
  // If no selected subpaths, fall back to transforming the entire path
  if (selectedSubpaths.length === 0) {
    return transformPathData(pathData, scaleX, scaleY, originX, originY, rotation);
  }

  try {
    // Parse the path into commands
    const commands = parsePathD(pathData.d);
    
    // Extract subpaths with their command ranges
    const subpaths = extractSubpaths(commands);
    
    // Create a copy of the original commands to modify
    let modifiedCommands = [...commands];
    
    // Transform only the selected subpaths
    selectedSubpaths.forEach(({ subpathIndex }) => {
      if (subpathIndex < subpaths.length) {
        const subpath = subpaths[subpathIndex];
        
        // Calculate the center of THIS specific subpath for rotation
        let subpathCenterX = originX;
        let subpathCenterY = originY;
        
        if (rotation !== 0) {
          // Get bounds of this specific subpath for rotation center
          const subpathBounds = measurePath(subpath.d, 1, 1);
          subpathCenterX = (subpathBounds.minX + subpathBounds.maxX) / 2;
          subpathCenterY = (subpathBounds.minY + subpathBounds.maxY) / 2;
        }
        
        // Extract the commands for this subpath
        const subpathCommands = commands.slice(subpath.startIndex, subpath.endIndex + 1);
        
        // Transform each command in this subpath using the same logic as transformPathData
        const transformedSubpathCommands = subpathCommands.map(cmd => {
          const transformedCmd = { ...cmd };
          
          // Transform all points in the command
          if (cmd.points && cmd.points.length > 0) {
            const transformedPoints = cmd.points.map(point => {
              let transformedPoint = { ...point };
              
              // Apply scale and translation using the full path origin (prevents amplification)
              transformedPoint = transformPoint(transformedPoint, scaleX, scaleY, originX, originY);
              
              // Apply rotation using the SUBPATH center (correct rotation behavior)
              if (rotation !== 0) {
                transformedPoint = rotatePoint(transformedPoint, rotation, subpathCenterX, subpathCenterY);
              }
              
              return transformedPoint;
            });
            
            transformedCmd.points = transformedPoints;
          }
          
          return transformedCmd;
        });
        
        // Replace the original subpath commands with transformed ones
        modifiedCommands.splice(subpath.startIndex, subpath.endIndex - subpath.startIndex + 1, ...transformedSubpathCommands);
      }
    });
    
    // Rebuild the path string from modified commands
    const newPathString = updatePathD(modifiedCommands, []);
    
    return {
      ...pathData,
      d: newPathString,
      // Scale stroke width proportionally
      strokeWidth: formatToPrecision(pathData.strokeWidth * Math.min(scaleX, scaleY), PATH_DECIMAL_PRECISION),
      // Remove transform since we've applied it directly
      transform: undefined
    };
    
  } catch (error) {
    console.warn('Subpath transformation failed, falling back to full path transformation:', error);
    return transformPathData(pathData, scaleX, scaleY, originX, originY, rotation);
  }
}

/**
 * Applies transformation to a single subpath with correct origin calculation
 */
export function transformSingleSubpath(
  pathData: PathData,
  subpathIndex: number,
  scaleX: number,
  scaleY: number,
  originX: number,
  originY: number,
  rotation: number = 0
): PathData {
  try {
    // Parse the path into commands
    const commands = parsePathD(pathData.d);
    
    // Extract subpaths with their command ranges
    const subpaths = extractSubpaths(commands);
    
    if (subpathIndex >= subpaths.length) {
      console.warn('Subpath index out of bounds, falling back to full path transformation');
      return transformPathData(pathData, scaleX, scaleY, originX, originY, rotation);
    }
    
    // Create a copy of the original commands to modify
    let modifiedCommands = [...commands];
    
    const subpath = subpaths[subpathIndex];
    
    // Calculate the center of THIS specific subpath for rotation (if needed)
    let subpathCenterX = originX;
    let subpathCenterY = originY;
    
    if (rotation !== 0) {
      // Get bounds of this specific subpath for rotation center
      const subpathBounds = measurePath(subpath.d, 1, 1);
      subpathCenterX = (subpathBounds.minX + subpathBounds.maxX) / 2;
      subpathCenterY = (subpathBounds.minY + subpathBounds.maxY) / 2;
    }
    
    // Extract the commands for this subpath
    const subpathCommands = commands.slice(subpath.startIndex, subpath.endIndex + 1);
    
    // Transform each command in this subpath
    const transformedSubpathCommands = subpathCommands.map(cmd => {
      const transformedCmd = { ...cmd };
      
      // Transform all points in the command
      if (cmd.points && cmd.points.length > 0) {
        const transformedPoints = cmd.points.map(point => {
          let transformedPoint = { ...point };
          
          // Apply scale and translation using the provided origin
          // (origin comes from the specific bounds of this subpath)
          transformedPoint = transformPoint(transformedPoint, scaleX, scaleY, originX, originY);
          
          // Apply rotation using the SUBPATH center (correct rotation behavior)
          if (rotation !== 0) {
            transformedPoint = rotatePoint(transformedPoint, rotation, subpathCenterX, subpathCenterY);
          }
          
          return transformedPoint;
        });
        
        transformedCmd.points = transformedPoints;
      }
      
      return transformedCmd;
    });
    
    // Replace the original subpath commands with transformed ones
    modifiedCommands.splice(subpath.startIndex, subpath.endIndex - subpath.startIndex + 1, ...transformedSubpathCommands);
    
    // Rebuild the path string from modified commands
    const newPathString = updatePathD(modifiedCommands, []);
    
    return {
      ...pathData,
      d: newPathString,
      // Scale stroke width proportionally
      strokeWidth: formatToPrecision(pathData.strokeWidth * Math.min(scaleX, scaleY), PATH_DECIMAL_PRECISION),
      // Remove transform since we've applied it directly
      transform: undefined
    };
    
  } catch (error) {
    console.warn('Single subpath transformation failed, falling back to full path transformation:', error);
    return transformPathData(pathData, scaleX, scaleY, originX, originY, rotation);
  }
}