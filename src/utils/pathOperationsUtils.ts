import type { PathData, SubPath, Command } from '../types';
import paper from 'paper';
import { logger } from './logger';

// Setup Paper.js for in-memory operations
// Temporarily override addEventListener to make all listeners passive during Paper.js setup
if (typeof document !== 'undefined') {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  // Store original addEventListener
  const originalAddEventListener = canvas.addEventListener.bind(canvas);
  
  // Override to add { passive: true } to all event listeners during setup
  canvas.addEventListener = function(
    this: HTMLCanvasElement, 
    type: string, 
    listener: EventListenerOrEventListenerObject, 
    options?: boolean | AddEventListenerOptions
  ) {
    const opts = typeof options === 'object' ? { ...options, passive: true } : { passive: true };
    return originalAddEventListener(type, listener, opts);
  };
  
  paper.setup(canvas);
  
  // Configure Paper.js settings for better curve preservation
  if (paper.settings) {
    // Increase precision for geometric calculations
    paper.settings.precision = 6; // Default is 5
    // Disable automatic curve simplification
    paper.settings.tolerance = 0.1; // Smaller tolerance means less simplification
  }
  
  // Restore original addEventListener
  canvas.addEventListener = originalAddEventListener;
}

/**
 * Generic function to perform boolean operations on paths using Paper.js
 */
function performBooleanOperation(
  paths: PathData[],
  operation: (path1: paper.Path | paper.CompoundPath, path2: paper.Path | paper.CompoundPath) => paper.PathItem,
  operationName: string
): PathData | null {
  if (paths.length === 0) return null;
  if (paths.length === 1) return paths[0];

  try {
    const paperPaths = paths.map(p => convertPathDataToPaperPath(p));
    let result = paperPaths[0];
    
    for (let i = 1; i < paperPaths.length; i++) {
      result = operation(result, paperPaths[i]) as paper.Path | paper.CompoundPath;
    }

    return convertPaperPathToPathData(result);
  } catch (error) {
    logger.error(`Error in ${operationName}`, error);
    return null;
  }
}

/**
 * Perform union operation on multiple paths (simple concatenation)
 */
export function performPathUnion(paths: PathData[]): PathData | null {
  if (paths.length === 0) return null;
  if (paths.length === 1) return paths[0];

  try {
    // Simple union: combine all subpaths from all paths
    const allSubPaths: SubPath[] = [];
    for (const pathData of paths) {
      allSubPaths.push(...pathData.subPaths);
    }

    // Use properties from first path
    return {
      ...paths[0],
      subPaths: allSubPaths
    };
  } catch (error) {
    logger.error('Error performing path union', error);
    return null;
  }
}

/**
 * Perform union operation on multiple paths using Paper.js boolean operations
 */
export function performPathUnionPaperJS(paths: PathData[]): PathData | null {
  return performBooleanOperation(
    paths, 
    (path1, path2) => path1.unite(path2), 
    'union'
  );
}

/**
 * Reverse the direction of a subpath
 */
export function reverseSubPath(subPath: SubPath): SubPath {
  if (subPath.length <= 1) return subPath;

  // Check if path is closed
  const hasZ = subPath[subPath.length - 1].type === 'Z';
  const commands = hasZ ? subPath.slice(0, -1) : subPath;

  if (commands.length <= 1) {
    return hasZ ? [...commands, { type: 'Z' }] : commands;
  }

  // Reverse the commands
  const reversedCommands = [...commands].reverse();

  // Build the new subpath
  const newCommands: Command[] = [];

  // First command should be M at the position of the last point of the original path
  const firstPoint = (commands[commands.length - 1] as Exclude<Command, { type: 'Z' }>).position;
  newCommands.push({
    type: 'M',
    position: firstPoint
  });

  // Process the reversed commands, skipping the last one (which was the original M)
  for (let i = 0; i < reversedCommands.length - 1; i++) {
    const cmd = reversedCommands[i];
    const previousPoint = (reversedCommands[i + 1] as Exclude<Command, { type: 'Z' }>).position;

    switch (cmd.type) {
      case 'M':
        // Convert M to L
        newCommands.push({
          type: 'L',
          position: previousPoint
        });
        break;

      case 'L':
        newCommands.push({
          type: 'L',
          position: previousPoint
        });
        break;

      case 'C':
        // For curves, swap control points
        newCommands.push({
          type: 'C',
          controlPoint1: cmd.controlPoint2,
          controlPoint2: cmd.controlPoint1,
          position: previousPoint
        });
        break;
    }
  }

  // Add Z if the original was closed
  if (hasZ) {
    newCommands.push({ type: 'Z' });
  }

  return newCommands;
}

export function convertPathDataToPaperPath(pathData: PathData): paper.Path | paper.CompoundPath {
  if (pathData.subPaths.length === 1) {
    // Single subPath, create Path
    const paperPath = new paper.Path();
    paperPath.fillColor = pathData.fillColor ? new paper.Color(pathData.fillColor) : null;
    paperPath.strokeColor = pathData.strokeColor ? new paper.Color(pathData.strokeColor) : null;
    paperPath.strokeWidth = pathData.strokeWidth || 1;

    const subPath = pathData.subPaths[0];
    let firstPosition: { x: number, y: number } | null = null;
    for (const cmd of subPath) {
      switch (cmd.type) {
        case 'M':
          firstPosition = cmd.position;
          paperPath.moveTo(new paper.Point(cmd.position.x, cmd.position.y));
          break;
        case 'L':
          paperPath.lineTo(new paper.Point(cmd.position.x, cmd.position.y));
          break;
        case 'C':
          paperPath.cubicCurveTo(
            new paper.Point(cmd.controlPoint1.x, cmd.controlPoint1.y),
            new paper.Point(cmd.controlPoint2.x, cmd.controlPoint2.y),
            new paper.Point(cmd.position.x, cmd.position.y)
          );
          break;
        case 'Z':
          paperPath.closePath();
          break;
      }
    }
    // If the path ends at the starting point, close it
    if (firstPosition && subPath.length > 1) {
      const lastCmd = subPath[subPath.length - 1];
      if (lastCmd.type !== 'Z' && lastCmd.position && Math.abs(lastCmd.position.x - firstPosition.x) < 0.001 && Math.abs(lastCmd.position.y - firstPosition.y) < 0.001) {
        paperPath.closePath();
      }
    }
    return paperPath;
  } else {
    // Multiple subPaths, create CompoundPath
    const compoundPath = new paper.CompoundPath('');
    for (const subPath of pathData.subPaths) {
      const childPath = new paper.Path();
      childPath.fillColor = pathData.fillColor ? new paper.Color(pathData.fillColor) : null;
      childPath.strokeColor = pathData.strokeColor ? new paper.Color(pathData.strokeColor) : null;
      childPath.strokeWidth = pathData.strokeWidth || 1;

      let firstPosition: { x: number, y: number } | null = null;
      for (const cmd of subPath) {
        switch (cmd.type) {
          case 'M':
            firstPosition = cmd.position;
            childPath.moveTo(new paper.Point(cmd.position.x, cmd.position.y));
            break;
          case 'L':
            childPath.lineTo(new paper.Point(cmd.position.x, cmd.position.y));
            break;
          case 'C':
            childPath.cubicCurveTo(
              new paper.Point(cmd.controlPoint1.x, cmd.controlPoint1.y),
              new paper.Point(cmd.controlPoint2.x, cmd.controlPoint2.y),
              new paper.Point(cmd.position.x, cmd.position.y)
            );
            break;
          case 'Z':
            childPath.closePath();
            break;
        }
      }
      // If the path ends at the starting point, close it
      if (firstPosition && subPath.length > 1) {
        const lastCmd = subPath[subPath.length - 1];
        if (lastCmd.type !== 'Z' && lastCmd.position && Math.abs(lastCmd.position.x - firstPosition.x) < 0.001 && Math.abs(lastCmd.position.y - firstPosition.y) < 0.001) {
          childPath.closePath();
        }
      }
      compoundPath.children.push(childPath);
    }
    return compoundPath;
  }
}

export function convertPaperPathToPathData(paperPath: paper.Path | paper.CompoundPath): PathData {
  if (paperPath instanceof paper.CompoundPath) {
    // Handle CompoundPath by combining all children into a single PathData with multiple subPaths
    const pathData: PathData = {
      subPaths: [],
      strokeWidth: paperPath.strokeWidth || 1,
      strokeColor: paperPath.strokeColor ? (paperPath.strokeColor as paper.Color).toCSS(true) : '#000000',
      strokeOpacity: 1,
      fillColor: paperPath.fillColor ? (paperPath.fillColor as paper.Color).toCSS(true) : 'none',
      fillOpacity: 1,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      fillRule: 'nonzero',
      strokeDasharray: 'none',
    };

    for (const child of paperPath.children) {
      if (child instanceof paper.Path) {
        const childData = convertSinglePaperPathToPathData(child);
        pathData.subPaths.push(...childData.subPaths);
      }
    }

    return pathData;
  } else {
    // Handle single Path
    return convertSinglePaperPathToPathData(paperPath);
  }
}

function convertSinglePaperPathToPathData(paperPath: paper.Path): PathData {
  const pathData: PathData = {
    subPaths: [],
    strokeWidth: paperPath.strokeWidth || 1,
    strokeColor: paperPath.strokeColor ? (paperPath.strokeColor as paper.Color).toCSS(true) : '#000000',
    strokeOpacity: 1,
    fillColor: paperPath.fillColor ? (paperPath.fillColor as paper.Color).toCSS(true) : 'none',
    fillOpacity: 1,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fillRule: 'nonzero',
    strokeDasharray: 'none',
  };

  // Helper function to round with precision
  const roundToPrecision = (value: number, precision = 2): number => {
    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
  };

  // Paper.js paths can have multiple segments, but for simplicity, assume one subpath
  const segments = paperPath.segments;
  if (segments.length > 0) {
    const subPath: SubPath = [];
    // M at first point
    subPath.push({ 
      type: 'M', 
      position: { 
        x: roundToPrecision(segments[0].point.x), 
        y: roundToPrecision(segments[0].point.y) 
      } 
    });
    
    // Process segments
    const numSegmentsToProcess = paperPath.closed ? segments.length : segments.length - 1;
    
    for (let i = 0; i < numSegmentsToProcess; i++) {
      const nextIndex = paperPath.closed ? (i + 1) % segments.length : i + 1;
      const cp1x = segments[i].point.x + segments[i].handleOut.x;
      const cp1y = segments[i].point.y + segments[i].handleOut.y;
      const cp2x = segments[nextIndex].point.x + segments[nextIndex].handleIn.x;
      const cp2y = segments[nextIndex].point.y + segments[nextIndex].handleIn.y;
      
      // Check if segment has bezier handles (use smaller threshold to preserve more curves)
      const hasHandles = Math.abs(segments[i].handleOut.x) > 0.001 || Math.abs(segments[i].handleOut.y) > 0.001 ||
                         Math.abs(segments[nextIndex].handleIn.x) > 0.001 || Math.abs(segments[nextIndex].handleIn.y) > 0.001;
      
      if (hasHandles) {
        const nextPoint = { 
          x: roundToPrecision(segments[nextIndex].point.x), 
          y: roundToPrecision(segments[nextIndex].point.y) 
        };
        subPath.push({
          type: 'C',
          controlPoint1: { 
            x: roundToPrecision(cp1x), 
            y: roundToPrecision(cp1y), 
            commandIndex: 0, 
            pointIndex: 0, 
            anchor: nextPoint, 
            isControl: true 
          },
          controlPoint2: { 
            x: roundToPrecision(cp2x), 
            y: roundToPrecision(cp2y), 
            commandIndex: 0, 
            pointIndex: 1, 
            anchor: nextPoint, 
            isControl: true 
          },
          position: nextPoint
        });
      } else {
        // Only convert to line if handles are truly negligible
        // Log when we're converting a curve to a line for debugging
        if (Math.abs(segments[i].handleOut.x) > 0 || Math.abs(segments[i].handleOut.y) > 0 ||
            Math.abs(segments[nextIndex].handleIn.x) > 0 || Math.abs(segments[nextIndex].handleIn.y) > 0) {
          console.debug('[PathOps] Very small handles detected, treating as line', {
            handleOut: { x: segments[i].handleOut.x, y: segments[i].handleOut.y },
            handleIn: { x: segments[nextIndex].handleIn.x, y: segments[nextIndex].handleIn.y }
          });
        }
        subPath.push({ 
          type: 'L', 
          position: { 
            x: roundToPrecision(segments[nextIndex].point.x), 
            y: roundToPrecision(segments[nextIndex].point.y) 
          } 
        });
      }
    }
    
    // Close the path if it was closed in Paper.js
    if (paperPath.closed) {
      subPath.push({ type: 'Z' });
    }
    
    pathData.subPaths.push(subPath);
  }

  return pathData;
}

export function performPathSubtraction(path1: PathData, path2: PathData): PathData | null {
  return performBooleanOperation(
    [path1, path2], 
    (pathA, pathB) => pathA.subtract(pathB), 
    'subtraction'
  );
}

export function performPathIntersect(path1: PathData, path2: PathData): PathData | null {
  return performBooleanOperation(
    [path1, path2], 
    (pathA, pathB) => pathA.intersect(pathB), 
    'intersect'
  );
}

export function performPathExclude(path1: PathData, path2: PathData): PathData | null {
  return performBooleanOperation(
    [path1, path2], 
    (pathA, pathB) => pathA.exclude(pathB), 
    'exclude'
  );
}

export function performPathDivide(path1: PathData, path2: PathData): PathData | null {
  return performBooleanOperation(
    [path1, path2], 
    (pathA, pathB) => pathA.divide(pathB), 
    'divide'
  );
}

/**
 * Simplify a path using Paper.js simplify method
 */
export function performPathSimplifyPaperJS(pathData: PathData, tolerance: number = 2.5): PathData | null {
  try {
    const paperPath = convertPathDataToPaperPath(pathData);
    
    if (paperPath instanceof paper.Path) {
      paperPath.simplify(tolerance);
      const simplifiedData = convertPaperPathToPathData(paperPath);
      // Preserve original style properties
      return {
        ...simplifiedData,
        strokeColor: pathData.strokeColor,
        strokeWidth: pathData.strokeWidth,
        strokeOpacity: pathData.strokeOpacity,
        fillColor: pathData.fillColor,
        fillOpacity: pathData.fillOpacity,
        strokeLinecap: pathData.strokeLinecap,
        strokeLinejoin: pathData.strokeLinejoin,
        fillRule: pathData.fillRule,
        strokeDasharray: pathData.strokeDasharray,
      };
    } else if (paperPath instanceof paper.CompoundPath) {
      // For compound paths, simplify each child path
      for (const child of paperPath.children) {
        if (child instanceof paper.Path) {
          child.simplify(tolerance);
        }
      }
      const simplifiedData = convertPaperPathToPathData(paperPath);
      // Preserve original style properties
      return {
        ...simplifiedData,
        strokeColor: pathData.strokeColor,
        strokeWidth: pathData.strokeWidth,
        strokeOpacity: pathData.strokeOpacity,
        fillColor: pathData.fillColor,
        fillOpacity: pathData.fillOpacity,
        strokeLinecap: pathData.strokeLinecap,
        strokeLinejoin: pathData.strokeLinejoin,
        fillRule: pathData.fillRule,
        strokeDasharray: pathData.strokeDasharray,
      };
    }
    
    return null;
  } catch (error) {
    logger.error('Error simplifying path with Paper.js', error);
    return null;
  }
}

/**
 * Round the corners of a path by converting sharp angles to smooth curves
 */
export function performPathRound(pathData: PathData, radius: number = 5): PathData | null {
  try {
    const paperPath = convertPathDataToPaperPath(pathData);
    
    if (paperPath instanceof paper.Path) {
      // Create a new path with rounded corners
      const roundedPath = new paper.Path();
      // Copy basic attributes
      roundedPath.strokeColor = paperPath.strokeColor;
      roundedPath.fillColor = paperPath.fillColor;
      roundedPath.strokeWidth = paperPath.strokeWidth;
      
      const segments = paperPath.segments;
      if (segments.length < 3) {
        // Not enough points to round
        return pathData;
      }
      
      for (let i = 0; i < segments.length; i++) {
        const prevIndex = (i - 1 + segments.length) % segments.length;
        const currIndex = i;
        const nextIndex = (i + 1) % segments.length;
        
        const prevSeg = segments[prevIndex];
        const currSeg = segments[currIndex];
        const nextSeg = segments[nextIndex];
        
        // Calculate vectors from current point to previous and next
        const toPrev = prevSeg.point.subtract(currSeg.point).normalize();
        const toNext = nextSeg.point.subtract(currSeg.point).normalize();
        
        // Calculate the angle between the vectors
        const angle = Math.abs(toPrev.getAngle(toNext));
        const isSharpCorner = angle > 30 && angle < 150; // Only round corners within this angle range
        
        if (isSharpCorner && !paperPath.closed && (i === 0 || i === segments.length - 1)) {
          // Don't round the first or last point of an open path
          roundedPath.add(currSeg.point);
        } else if (isSharpCorner) {
          // Calculate the distance to move inward from the corner
          const effectiveRadius = Math.min(radius, 
            currSeg.point.getDistance(prevSeg.point) * 0.4,
            currSeg.point.getDistance(nextSeg.point) * 0.4
          );
          
          // Calculate points along the edges
          const pointToPrev = currSeg.point.add(toPrev.multiply(effectiveRadius));
          const pointToNext = currSeg.point.add(toNext.multiply(effectiveRadius));
          
          // Add the rounded corner as a curve
          if (roundedPath.segments.length === 0) {
            roundedPath.moveTo(pointToPrev);
          } else {
            roundedPath.lineTo(pointToPrev);
          }
          
          // Create a smooth curve through the corner
          const controlDistance = effectiveRadius * 0.5522847498; // Magic number for circle approximation
          const prevControl = pointToPrev.add(toPrev.multiply(-controlDistance));
          const nextControl = pointToNext.add(toNext.multiply(-controlDistance));
          
          roundedPath.cubicCurveTo(prevControl, nextControl, pointToNext);
        } else {
          // Keep the original point for non-sharp corners
          if (roundedPath.segments.length === 0) {
            roundedPath.moveTo(currSeg.point);
          } else {
            roundedPath.lineTo(currSeg.point);
          }
        }
      }
      
      // Close the path if the original was closed
      if (paperPath.closed) {
        roundedPath.closePath();
      }
      
      const roundedData = convertPaperPathToPathData(roundedPath);
      
      // Preserve original style properties
      return {
        ...roundedData,
        strokeColor: pathData.strokeColor,
        strokeWidth: pathData.strokeWidth,
        strokeOpacity: pathData.strokeOpacity,
        fillColor: pathData.fillColor,
        fillOpacity: pathData.fillOpacity,
        strokeLinecap: pathData.strokeLinecap,
        strokeLinejoin: pathData.strokeLinejoin,
        fillRule: pathData.fillRule,
        strokeDasharray: pathData.strokeDasharray,
      };
    } else if (paperPath instanceof paper.CompoundPath) {
      // For compound paths, round each child path
      const roundedChildren: paper.Path[] = [];
      
      for (const child of paperPath.children) {
        if (child instanceof paper.Path) {
          const childData = convertSinglePaperPathToPathData(child);
          const roundedChildData = performPathRound(childData, radius);
          if (roundedChildData) {
            const roundedChildPath = convertPathDataToPaperPath(roundedChildData);
            if (roundedChildPath instanceof paper.Path) {
              roundedChildren.push(roundedChildPath);
            }
          }
        }
      }
      
      if (roundedChildren.length > 0) {
        const compoundPath = new paper.CompoundPath({
          children: roundedChildren
        });
        
        const roundedData = convertPaperPathToPathData(compoundPath);
        
        // Preserve original style properties
        return {
          ...roundedData,
          strokeColor: pathData.strokeColor,
          strokeWidth: pathData.strokeWidth,
          strokeOpacity: pathData.strokeOpacity,
          fillColor: pathData.fillColor,
          fillOpacity: pathData.fillOpacity,
          strokeLinecap: pathData.strokeLinecap,
          strokeLinejoin: pathData.strokeLinejoin,
          fillRule: pathData.fillRule,
          strokeDasharray: pathData.strokeDasharray,
        };
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Error rounding path with Paper.js', error);
    return null;
  }
}

