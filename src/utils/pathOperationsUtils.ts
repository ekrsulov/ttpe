import type { PathData, SubPath, Command } from '../types';
import paper from 'paper';

// Setup Paper.js for in-memory operations
paper.setup(new paper.Size(1, 1));

/**
 * Perform union operation on multiple paths
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
    console.error('Error performing path union:', error);
    return null;
  }
}

/**
 * Perform union operation on multiple paths using Paper.js boolean operations
 */
export function performPathUnionPaperJS(paths: PathData[]): PathData | null {
  if (paths.length === 0) return null;
  if (paths.length === 1) return paths[0];

  try {
    // Use boolean union for all cases
    const paperPaths = paths.map(p => convertPathDataToPaperPath(p));
    let result: paper.PathItem = paperPaths[0];
    for (let i = 1; i < paperPaths.length; i++) {
      result = result.unite(paperPaths[i]);
    }

    if (result instanceof paper.Path) {
      return convertPaperPathToPathData(result);
    } else if (result instanceof paper.CompoundPath) {
      const combinedPathData: PathData = {
        subPaths: [],
        strokeWidth: 1,
        strokeColor: '#000000',
        strokeOpacity: 1,
        fillColor: '#000000',
        fillOpacity: 1,
      };
      for (const child of result.children) {
        if (child instanceof paper.Path) {
          const childData = convertPaperPathToPathData(child);
          combinedPathData.subPaths.push(...childData.subPaths);
        }
      }
      return combinedPathData;
    }
    return null;
  } catch (error) {
    console.error('Error performing path union with Paper.js:', error);
    return null;
  }
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

function convertPathDataToPaperPath(pathData: PathData): paper.Path | paper.CompoundPath {
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

function convertPaperPathToPathData(paperPath: paper.Path | paper.CompoundPath): PathData {
  if (paperPath instanceof paper.CompoundPath) {
    // Handle CompoundPath by combining all children into a single PathData with multiple subPaths
    const pathData: PathData = {
      subPaths: [],
      strokeWidth: paperPath.strokeWidth || 1,
      strokeColor: paperPath.strokeColor ? (paperPath.strokeColor as paper.Color).toCSS(true) : '#000000',
      strokeOpacity: 1,
      fillColor: paperPath.fillColor ? (paperPath.fillColor as paper.Color).toCSS(true) : '#000000',
      fillOpacity: 1,
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
    fillColor: paperPath.fillColor ? (paperPath.fillColor as paper.Color).toCSS(true) : '#000000',
    fillOpacity: 1,
  };

  // Paper.js paths can have multiple segments, but for simplicity, assume one subpath
  const segments = paperPath.segments;
  if (segments.length > 0) {
    const subPath: SubPath = [];
    // M at first point
    subPath.push({ type: 'M', position: { x: Math.round(segments[0].point.x), y: Math.round(segments[0].point.y) } });
    
    // Process segments (for closed paths, the last segment connects back to first, so we handle it with Z)
    const numSegmentsToProcess = paperPath.closed ? segments.length - 1 : segments.length - 1;
    
    for (let i = 0; i < numSegmentsToProcess; i++) {
      const nextIndex = i + 1;
      const cp1x = segments[i].point.x + segments[i].handleOut.x;
      const cp1y = segments[i].point.y + segments[i].handleOut.y;
      const cp2x = segments[nextIndex].point.x + segments[nextIndex].handleIn.x;
      const cp2y = segments[nextIndex].point.y + segments[nextIndex].handleIn.y;
      
      const hasHandles = Math.abs(segments[i].handleOut.x) > 0.01 || Math.abs(segments[i].handleOut.y) > 0.01 ||
                         Math.abs(segments[nextIndex].handleIn.x) > 0.01 || Math.abs(segments[nextIndex].handleIn.y) > 0.01;
      
      if (hasHandles) {
        subPath.push({
          type: 'C',
          controlPoint1: { x: Math.round(cp1x), y: Math.round(cp1y), commandIndex: 0, pointIndex: 0, type: 'independent' as const, anchor: { x: Math.round(segments[nextIndex].point.x), y: Math.round(segments[nextIndex].point.y) }, isControl: true },
          controlPoint2: { x: Math.round(cp2x), y: Math.round(cp2y), commandIndex: 0, pointIndex: 0, type: 'independent' as const, anchor: { x: Math.round(segments[nextIndex].point.x), y: Math.round(segments[nextIndex].point.y) }, isControl: true },
          position: { x: Math.round(segments[nextIndex].point.x), y: Math.round(segments[nextIndex].point.y) }
        });
      } else {
        subPath.push({ type: 'L', position: { x: Math.round(segments[nextIndex].point.x), y: Math.round(segments[nextIndex].point.y) } });
      }
    }
    
    // Close the path if it was closed in Paper.js
    if (paperPath.closed) {
      subPath.push({ type: 'Z' });
    }
    
    pathData.subPaths.push(subPath);
  }

  return pathData;
}export function performPathSubtraction(path1: PathData, path2: PathData): PathData | null {
  try {
    const paperPath1 = convertPathDataToPaperPath(path1);
    const paperPath2 = convertPathDataToPaperPath(path2);

    const result = paperPath1.subtract(paperPath2);

    if (result instanceof paper.Path) {
      return convertPaperPathToPathData(result);
    } else if (result instanceof paper.CompoundPath) {
      const combinedPathData: PathData = {
        subPaths: [],
        strokeWidth: 1,
        strokeColor: '#000000',
        strokeOpacity: 1,
        fillColor: '#000000',
        fillOpacity: 1,
      };
      for (const child of result.children) {
        if (child instanceof paper.Path) {
          const childData = convertPaperPathToPathData(child);
          combinedPathData.subPaths.push(...childData.subPaths);
          // Take properties from the first child
          if (combinedPathData.subPaths.length === childData.subPaths.length) {
            combinedPathData.strokeWidth = childData.strokeWidth;
            combinedPathData.strokeColor = childData.strokeColor;
            combinedPathData.strokeOpacity = childData.strokeOpacity;
            combinedPathData.fillColor = childData.fillColor;
            combinedPathData.fillOpacity = childData.fillOpacity;
          }
        }
      }
      return combinedPathData;
    }
    return null;
  } catch (error) {
    console.error('Error performing path subtraction:', error);
    return null;
  }
}export function performPathIntersect(path1: PathData, path2: PathData): PathData | null {
  try {
    const paperPath1 = convertPathDataToPaperPath(path1);
    const paperPath2 = convertPathDataToPaperPath(path2);

    const result = paperPath1.intersect(paperPath2);

    if (result instanceof paper.Path) {
      return convertPaperPathToPathData(result);
    } else if (result instanceof paper.CompoundPath) {
      const combinedPathData: PathData = {
        subPaths: [],
        strokeWidth: 1,
        strokeColor: '#000000',
        strokeOpacity: 1,
        fillColor: '#000000',
        fillOpacity: 1,
      };
      for (const child of result.children) {
        if (child instanceof paper.Path) {
          const childData = convertPaperPathToPathData(child);
          combinedPathData.subPaths.push(...childData.subPaths);
          // Take properties from the first child
          if (combinedPathData.subPaths.length === childData.subPaths.length) {
            combinedPathData.strokeWidth = childData.strokeWidth;
            combinedPathData.strokeColor = childData.strokeColor;
            combinedPathData.strokeOpacity = childData.strokeOpacity;
            combinedPathData.fillColor = childData.fillColor;
            combinedPathData.fillOpacity = childData.fillOpacity;
          }
        }
      }
      return combinedPathData;
    }
    return null;
  } catch (error) {
    console.error('Error performing path intersect:', error);
    return null;
  }
}

export function performPathExclude(path1: PathData, path2: PathData): PathData | null {
  try {
    const paperPath1 = convertPathDataToPaperPath(path1);
    const paperPath2 = convertPathDataToPaperPath(path2);

    const result = paperPath1.exclude(paperPath2);

    if (result instanceof paper.Path) {
      return convertPaperPathToPathData(result);
    } else if (result instanceof paper.CompoundPath) {
      const combinedPathData: PathData = {
        subPaths: [],
        strokeWidth: 1,
        strokeColor: '#000000',
        strokeOpacity: 1,
        fillColor: '#000000',
        fillOpacity: 1,
      };
      for (const child of result.children) {
        if (child instanceof paper.Path) {
          const childData = convertPaperPathToPathData(child);
          combinedPathData.subPaths.push(...childData.subPaths);
          // Take properties from the first child
          if (combinedPathData.subPaths.length === childData.subPaths.length) {
            combinedPathData.strokeWidth = childData.strokeWidth;
            combinedPathData.strokeColor = childData.strokeColor;
            combinedPathData.strokeOpacity = childData.strokeOpacity;
            combinedPathData.fillColor = childData.fillColor;
            combinedPathData.fillOpacity = childData.fillOpacity;
          }
        }
      }
      return combinedPathData;
    }
    return null;
  } catch (error) {
    console.error('Error performing path exclude:', error);
    return null;
  }
}

export function performPathDivide(path1: PathData, path2: PathData): PathData | null {
  try {
    const paperPath1 = convertPathDataToPaperPath(path1);
    const paperPath2 = convertPathDataToPaperPath(path2);

    const result = paperPath1.divide(paperPath2);

    if (result instanceof paper.Path) {
      return convertPaperPathToPathData(result);
    } else if (result instanceof paper.CompoundPath) {
      const combinedPathData: PathData = {
        subPaths: [],
        strokeWidth: 1,
        strokeColor: '#000000',
        strokeOpacity: 1,
        fillColor: '#000000',
        fillOpacity: 1,
      };
      for (const child of result.children) {
        if (child instanceof paper.Path) {
          const childData = convertPaperPathToPathData(child);
          combinedPathData.subPaths.push(...childData.subPaths);
          // Take properties from the first child
          if (combinedPathData.subPaths.length === childData.subPaths.length) {
            combinedPathData.strokeWidth = childData.strokeWidth;
            combinedPathData.strokeColor = childData.strokeColor;
            combinedPathData.strokeOpacity = childData.strokeOpacity;
            combinedPathData.fillColor = childData.fillColor;
            combinedPathData.fillOpacity = childData.fillOpacity;
          }
        }
      }
      return combinedPathData;
    }
    return null;
  } catch (error) {
    console.error('Error performing path divide:', error);
    return null;
  }
}

/**
 * Simplify a path using Paper.js simplify method
 */
export function performPathSimplifyPaperJS(pathData: PathData, tolerance: number = 2.5): PathData | null {
  try {
    const paperPath = convertPathDataToPaperPath(pathData);
    
    if (paperPath instanceof paper.Path) {
      paperPath.simplify(tolerance);
      return convertPaperPathToPathData(paperPath);
    } else if (paperPath instanceof paper.CompoundPath) {
      // For compound paths, simplify each child path
      for (const child of paperPath.children) {
        if (child instanceof paper.Path) {
          child.simplify(tolerance);
        }
      }
      return convertPaperPathToPathData(paperPath);
    }
    
    return null;
  } catch (error) {
    console.error('Error simplifying path with Paper.js:', error);
    return null;
  }
}

