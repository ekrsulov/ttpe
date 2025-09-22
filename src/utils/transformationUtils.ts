import type { PathData, Point, Command } from '../types';
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
 * Translates a point by the given deltas
 */
export function translatePoint(point: Point, deltaX: number, deltaY: number): Point {
  return {
    x: formatToPrecision(point.x + deltaX, PATH_DECIMAL_PRECISION),
    y: formatToPrecision(point.y + deltaY, PATH_DECIMAL_PRECISION)
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

export function transformPathData(
  pathData: PathData, 
  scaleX: number, 
  scaleY: number, 
  originX: number, 
  originY: number,
  rotation: number = 0
): PathData {
  // Transform all subpaths directly
  try {
    const commands = pathData.subPaths.flat();
    
    // Transform each command
    const transformedCommands = commands.map(cmd => {
      const transformedCmd = { ...cmd };
      
      // Transform points based on command type
      if (cmd.type === 'M' || cmd.type === 'L') {
        let transformedPoint = { ...cmd.position };
        transformedPoint = transformPoint(transformedPoint, scaleX, scaleY, originX, originY);
        if (rotation !== 0) {
          transformedPoint = rotatePoint(transformedPoint, rotation, originX, originY);
        }
        (transformedCmd as { position: Point }).position = transformedPoint;
      } else if (cmd.type === 'C') {
        let cp1 = { ...cmd.controlPoint1 };
        let cp2 = { ...cmd.controlPoint2 };
        let pos = { ...cmd.position };
        
        cp1 = { ...cp1, ...transformPoint({x: cp1.x, y: cp1.y}, scaleX, scaleY, originX, originY) };
        cp2 = { ...cp2, ...transformPoint({x: cp2.x, y: cp2.y}, scaleX, scaleY, originX, originY) };
        pos = transformPoint(pos, scaleX, scaleY, originX, originY);
        
        if (rotation !== 0) {
          cp1 = { ...cp1, ...rotatePoint({x: cp1.x, y: cp1.y}, rotation, originX, originY) };
          cp2 = { ...cp2, ...rotatePoint({x: cp2.x, y: cp2.y}, rotation, originX, originY) };
          pos = rotatePoint(pos, rotation, originX, originY);
        }
        
        (transformedCmd as Command & { type: 'C' }).controlPoint1 = { ...cmd.controlPoint1, ...cp1 };
        (transformedCmd as Command & { type: 'C' }).controlPoint2 = { ...cmd.controlPoint2, ...cp2 };
        (transformedCmd as Command & { type: 'C' }).position = pos;
      }
      // Z has no points to transform
      
      return transformedCmd;
    });
    
    // Rebuild the path from transformed commands
    const newPathString = updatePathD(transformedCommands, []);
    const newSubPaths = extractSubpaths(parsePathD(newPathString)).map(sp => sp.commands);
    
    return {
      ...pathData,
      subPaths: newSubPaths,
      // Scale stroke width proportionally
      strokeWidth: formatToPrecision(pathData.strokeWidth * Math.min(scaleX, scaleY), PATH_DECIMAL_PRECISION),
      // Remove transform since we've applied it directly
      transform: undefined
    };
    
  } catch (error) {
    console.warn('Path transformation failed:', error);
    return pathData; // Return original if transformation fails
  }
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
  // If no selected subpaths, transform all subpaths
  const shouldTransformAll = selectedSubpaths.length === 0;
  
  if (shouldTransformAll) {
    // Get all subpaths to transform
    const commands = pathData.subPaths.flat();
    const allSubpaths = extractSubpaths(commands);
    selectedSubpaths = allSubpaths.map((_, index) => ({ elementId: '', subpathIndex: index }));
  }

  try {
    // Parse the path into commands
    const commands = pathData.subPaths.flat();
    
    // Extract subpaths with their command ranges
    const subpaths = extractSubpaths(commands);
    
    // Create a copy of the original commands to modify
    const modifiedCommands = [...commands];
    
    // Transform only the selected subpaths
    selectedSubpaths.forEach(({ subpathIndex }) => {
      if (subpathIndex < subpaths.length) {
        const subpath = subpaths[subpathIndex];
        
        // Calculate the center of THIS specific subpath for rotation
        let subpathCenterX = originX;
        let subpathCenterY = originY;
        
        if (rotation !== 0) {
          // Get bounds of this specific subpath for rotation center
          const subpathBounds = measurePath([subpath.commands], 1, 1);
          subpathCenterX = (subpathBounds.minX + subpathBounds.maxX) / 2;
          subpathCenterY = (subpathBounds.minY + subpathBounds.maxY) / 2;
        }
        
        // Extract the commands for this subpath
        const subpathCommands = commands.slice(subpath.startIndex, subpath.endIndex + 1);
        
        // Transform each command in this subpath using the same logic as transformPathData
        const transformedSubpathCommands = subpathCommands.map(cmd => {
          const transformedCmd = { ...cmd };
          
          // Transform points based on command type
          if (cmd.type === 'M' || cmd.type === 'L') {
            let transformedPoint = { ...cmd.position };
            transformedPoint = transformPoint(transformedPoint, scaleX, scaleY, originX, originY);
            if (rotation !== 0) {
              transformedPoint = rotatePoint(transformedPoint, rotation, subpathCenterX, subpathCenterY);
            }
            (transformedCmd as { position: Point }).position = transformedPoint;
          } else if (cmd.type === 'C') {
            let cp1 = { ...cmd.controlPoint1 };
            let cp2 = { ...cmd.controlPoint2 };
            let pos = { ...cmd.position };
            
            cp1 = { ...cp1, ...transformPoint({x: cp1.x, y: cp1.y}, scaleX, scaleY, originX, originY) };
            cp2 = { ...cp2, ...transformPoint({x: cp2.x, y: cp2.y}, scaleX, scaleY, originX, originY) };
            pos = transformPoint(pos, scaleX, scaleY, originX, originY);
            
            if (rotation !== 0) {
              cp1 = { ...cp1, ...rotatePoint({x: cp1.x, y: cp1.y}, rotation, subpathCenterX, subpathCenterY) };
              cp2 = { ...cp2, ...rotatePoint({x: cp2.x, y: cp2.y}, rotation, subpathCenterX, subpathCenterY) };
              pos = rotatePoint(pos, rotation, subpathCenterX, subpathCenterY);
            }
            
            (transformedCmd as Command & { type: 'C' }).controlPoint1 = { ...cmd.controlPoint1, ...cp1 };
            (transformedCmd as Command & { type: 'C' }).controlPoint2 = { ...cmd.controlPoint2, ...cp2 };
            (transformedCmd as Command & { type: 'C' }).position = pos;
          }
          // Z has no points to transform
          
          return transformedCmd;
        });
        
        // Replace the original subpath commands with transformed ones
        modifiedCommands.splice(subpath.startIndex, subpath.endIndex - subpath.startIndex + 1, ...transformedSubpathCommands);
      }
    });
    
    // Rebuild the path string from modified commands
    const newPathString = updatePathD(modifiedCommands, []);
    const newSubPaths = extractSubpaths(parsePathD(newPathString)).map(sp => sp.commands);
    
    return {
      ...pathData,
      subPaths: newSubPaths,
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
    // Use the subPaths directly
    const commands = pathData.subPaths.flat();
    
    // Extract subpaths with their command ranges
    const subpaths = extractSubpaths(commands);
    
    if (subpathIndex >= subpaths.length) {
      console.warn('Subpath index out of bounds, falling back to full path transformation');
      return transformPathData(pathData, scaleX, scaleY, originX, originY, rotation);
    }
    
    // Create a copy of the original commands to modify
    const modifiedCommands = [...commands];
    
    const subpath = subpaths[subpathIndex];
    
    // Calculate the center of THIS specific subpath for rotation (if needed)
    let subpathCenterX = originX;
    let subpathCenterY = originY;
    
    if (rotation !== 0) {
      // Get bounds of this specific subpath for rotation center
      const subpathBounds = measurePath([subpath.commands], 1, 1);
      subpathCenterX = (subpathBounds.minX + subpathBounds.maxX) / 2;
      subpathCenterY = (subpathBounds.minY + subpathBounds.maxY) / 2;
    }
    
    // Extract the commands for this subpath
    const subpathCommands = commands.slice(subpath.startIndex, subpath.endIndex + 1);
    
    // Transform each command in this subpath
    const transformedSubpathCommands = subpathCommands.map(cmd => {
      const transformedCmd = { ...cmd };
      
      // Transform points based on command type
      if (cmd.type === 'M' || cmd.type === 'L') {
        let transformedPoint = { ...cmd.position };
        transformedPoint = transformPoint(transformedPoint, scaleX, scaleY, originX, originY);
        if (rotation !== 0) {
          transformedPoint = rotatePoint(transformedPoint, rotation, subpathCenterX, subpathCenterY);
        }
        (transformedCmd as { position: Point }).position = transformedPoint;
      } else if (cmd.type === 'C') {
        let cp1 = { ...cmd.controlPoint1 };
        let cp2 = { ...cmd.controlPoint2 };
        let pos = { ...cmd.position };
        
        cp1 = { ...cp1, ...transformPoint({x: cp1.x, y: cp1.y}, scaleX, scaleY, originX, originY) };
        cp2 = { ...cp2, ...transformPoint({x: cp2.x, y: cp2.y}, scaleX, scaleY, originX, originY) };
        pos = transformPoint(pos, scaleX, scaleY, originX, originY);
        
        if (rotation !== 0) {
          cp1 = { ...cp1, ...rotatePoint({x: cp1.x, y: cp1.y}, rotation, subpathCenterX, subpathCenterY) };
          cp2 = { ...cp2, ...rotatePoint({x: cp2.x, y: cp2.y}, rotation, subpathCenterX, subpathCenterY) };
          pos = rotatePoint(pos, rotation, subpathCenterX, subpathCenterY);
        }
        
        (transformedCmd as Command & { type: 'C' }).controlPoint1 = cp1;
        (transformedCmd as Command & { type: 'C' }).controlPoint2 = cp2;
        (transformedCmd as Command & { type: 'C' }).position = pos;
      }
      // Z has no points to transform
      
      return transformedCmd;
    });
    
    // Replace the original subpath commands with transformed ones
    modifiedCommands.splice(subpath.startIndex, subpath.endIndex - subpath.startIndex + 1, ...transformedSubpathCommands);
    
    // Rebuild subPaths from modified commands
    const newSubPaths = extractSubpaths(modifiedCommands).map(sp => sp.commands);
    
    return {
      ...pathData,
      subPaths: newSubPaths,
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