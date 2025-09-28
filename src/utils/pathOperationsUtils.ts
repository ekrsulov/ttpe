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
    for (const cmd of subPath) {
      switch (cmd.type) {
        case 'M':
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
    return paperPath;
  } else {
    // Multiple subPaths, create CompoundPath
    const compoundPath = new paper.CompoundPath('');
    for (const subPath of pathData.subPaths) {
      const childPath = new paper.Path();
      childPath.fillColor = pathData.fillColor ? new paper.Color(pathData.fillColor) : null;
      childPath.strokeColor = pathData.strokeColor ? new paper.Color(pathData.strokeColor) : null;
      childPath.strokeWidth = pathData.strokeWidth || 1;

      for (const cmd of subPath) {
        switch (cmd.type) {
          case 'M':
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
      compoundPath.children.push(childPath);
    }
    return compoundPath;
  }
}

function convertPaperPathToPathData(paperPath: paper.Path): PathData {
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
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (i === 0) {
        subPath.push({ type: 'M', position: { x: Math.round(segment.point.x), y: Math.round(segment.point.y) } });
      } else {
        if (segment.handleIn && segment.handleOut) {
          let isCurve = false;
          let cp1x = 0, cp1y = 0, cp2x = 0, cp2y = 0;
          if (i > 0) {
            const prevSegment = segments[i - 1];
            cp1x = prevSegment.handleOut.x + prevSegment.point.x;
            cp1y = prevSegment.handleOut.y + prevSegment.point.y;
            cp2x = segment.handleIn.x + segment.point.x;
            cp2y = segment.handleIn.y + segment.point.y;
            isCurve = Math.abs(prevSegment.handleOut.x) > 15.0 || Math.abs(prevSegment.handleOut.y) > 15.0 || Math.abs(segment.handleIn.x) > 15.0 || Math.abs(segment.handleIn.y) > 15.0;
            if (isCurve) {
              const prevPoint = segments[i - 1].point;
              const cp1 = new paper.Point(cp1x, cp1y);
              const cp2 = new paper.Point(cp2x, cp2y);
              const dist1 = distanceToLine(cp1, prevPoint, segment.point);
              const dist2 = distanceToLine(cp2, prevPoint, segment.point);
              isCurve = isCurve && (dist1 > 0.1 || dist2 > 0.1);
            }
          }
          if (isCurve) {
            // It's a curve
            subPath.push({
              type: 'C',
              controlPoint1: { x: Math.round(cp1x), y: Math.round(cp1y), commandIndex: 0, pointIndex: 0, type: 'independent' as const, anchor: { x: Math.round(segment.point.x), y: Math.round(segment.point.y) }, isControl: true },
              controlPoint2: { x: Math.round(cp2x), y: Math.round(cp2y), commandIndex: 0, pointIndex: 0, type: 'independent' as const, anchor: { x: Math.round(segment.point.x), y: Math.round(segment.point.y) }, isControl: true },
              position: { x: Math.round(segment.point.x), y: Math.round(segment.point.y) }
            });
          } else {
            subPath.push({ type: 'L', position: { x: Math.round(segment.point.x), y: Math.round(segment.point.y) } });
          }
        } else {
          subPath.push({ type: 'L', position: { x: Math.round(segment.point.x), y: Math.round(segment.point.y) } });
        }
      }
    }
    if (paperPath.closed) {
      subPath.push({ type: 'Z' });
    }
    pathData.subPaths.push(subPath);
  }

  return pathData;
}

export function performPathSubtraction(path1: PathData, path2: PathData): PathData | null {
  try {
    const paperPath1 = convertPathDataToPaperPath(path1);
    const paperPath2 = convertPathDataToPaperPath(path2);

    let result = paperPath1.subtract(paperPath2);

    // Resolve crossings to handle self-intersections and knots
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (result && typeof (result as any).resolveCrossings === 'function') {
      // @ts-expect-error resolveCrossings exists in runtime but not in types
      result = result.resolveCrossings();
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
}

function distanceToLine(point: paper.Point, lineStart: paper.Point, lineEnd: paper.Point): number {
  const A = lineStart.y - lineEnd.y;
  const B = lineEnd.x - lineStart.x;
  const C = lineStart.x * lineEnd.y - lineEnd.x * lineStart.y;
  return Math.abs(A * point.x + B * point.y + C) / Math.sqrt(A * A + B * B);
}