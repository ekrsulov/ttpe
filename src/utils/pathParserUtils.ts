import type { Point, ControlPointInfo, Command, SubPath } from '../types';
import { PATH_DECIMAL_PRECISION } from '../types';

// Utility function to format numbers to precision
function formatToPrecision(num: number, precision: number = 2): number {
  return parseFloat(num.toFixed(precision));
}

export interface PathCommand {
  type: 'M' | 'L' | 'C' | 'Z';
  points: Point[];
}

export interface ControlPoint extends Point, ControlPointInfo {
  isControl: boolean;
  associatedCommandIndex?: number;
  associatedPointIndex?: number;
}

/**
 * Parse SVG path d string into commands and points
 */
export function parsePathD(d: string): Command[] {
  const commands: Command[] = [];
  const tokens = d.trim().split(/[\s,]+/);

  let i = 0;
  let commandIndex = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (!token) {
      i++;
      continue;
    }

    const command = token.toUpperCase();
    if (command === 'M') {
      const points: Point[] = [];
      i++;
      while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
        const x = parseFloat(tokens[i]);
        const y = parseFloat(tokens[i + 1]);
        points.push({ x, y });
        i += 2;
      }
      commands.push({ type: 'M', position: points[0] });
    } else if (command === 'L') {
      const points: Point[] = [];
      i++;
      while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
        const x = parseFloat(tokens[i]);
        const y = parseFloat(tokens[i + 1]);
        points.push({ x, y });
        i += 2;
      }
      commands.push({ type: 'L', position: points[0] });
    } else if (command === 'C') {
      const points: Point[] = [];
      i++;
      while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
        const x = parseFloat(tokens[i]);
        const y = parseFloat(tokens[i + 1]);
        points.push({ x, y });
        i += 2;
      }
      const controlPoint1: ControlPoint = {
        ...points[0],
        commandIndex,
        pointIndex: 0,
        type: 'independent',
        anchor: points[2],
        isControl: true
      };
      const controlPoint2: ControlPoint = {
        ...points[1],
        commandIndex,
        pointIndex: 1,
        type: 'independent',
        anchor: points[2],
        isControl: true
      };
      commands.push({ type: 'C', controlPoint1, controlPoint2, position: points[2] });
    } else if (command === 'Z') {
      commands.push({ type: 'Z' });
      i++;
    } else {
      i++;
    }
    commandIndex++;
  }

  return commands;
}

/**
 * Extract all points from parsed commands for editing
 */
export function extractEditablePoints(commands: Command[]): ControlPoint[] {
  const points: ControlPoint[] = [];
  let commandIndex = 0;

  for (const command of commands) {
    if (command.type === 'M' || command.type === 'L') {
      // M and L have one point
      points.push({
        commandIndex,
        pointIndex: 0,
        x: command.position.x,
        y: command.position.y,
        type: 'independent',
        anchor: command.position,
        isControl: false,
      });
    } else if (command.type === 'C') {
      // C has 3 points: control1, control2, end
      points.push({
        ...command.controlPoint1,
        isControl: true,
        associatedCommandIndex: commandIndex,
        associatedPointIndex: 2, // associated with end point
      });
      points.push({
        ...command.controlPoint2,
        isControl: true,
        associatedCommandIndex: commandIndex,
        associatedPointIndex: 2, // associated with end point
      });
      points.push({
        commandIndex,
        pointIndex: 2,
        x: command.position.x,
        y: command.position.y,
        type: 'independent',
        anchor: command.position,
        isControl: false,
        associatedCommandIndex: commandIndex,
        associatedPointIndex: 0, // associated with control1
      });
    }
    commandIndex++;
  }

  return points;
}

/**
 * Get the starting point for a command (needed for control line drawing)
 */
export function getCommandStartPoint(commands: Command[], commandIndex: number): Point | null {
  if (commandIndex === 0) {
    // First command should be M
    if (commands[0].type === 'M') {
      return commands[0].position;
    }
    return null;
  }

  // For subsequent commands, the start point is the last point of the previous command
  const prevCommand = commands[commandIndex - 1];
  if (prevCommand.type === 'Z') {
    // Z closes to the first M point
    if (commands[0].type === 'M') {
      return commands[0].position;
    }
    return null;
  }

  // Get the last point of the previous command
  if (prevCommand.type === 'M' || prevCommand.type === 'L') {
    return prevCommand.position;
  } else if (prevCommand.type === 'C') {
    return prevCommand.position;
  }
  return null;
}

/**
 * Update path d string from modified points
 */
export function updatePathD(commands: Command[], updatedPoints: ControlPoint[]): string {
  const updatedCommands = updateCommands(commands, updatedPoints);
  return commandsToString(updatedCommands);
}

export function updateCommands(commands: Command[], updatedPoints: ControlPoint[]): Command[] {
  // Create a copy of commands to modify
  const updatedCommands = commands.map(cmd => {
    if (cmd.type === 'M' || cmd.type === 'L') {
      return { ...cmd, position: { ...cmd.position } };
    } else if (cmd.type === 'C') {
      return { ...cmd, controlPoint1: { ...cmd.controlPoint1 }, controlPoint2: { ...cmd.controlPoint2 }, position: { ...cmd.position } };
    } else {
      return { ...cmd };
    }
  });

  // Apply updates to the commands
  updatedPoints.forEach(updatedPoint => {
    const cmd = updatedCommands[updatedPoint.commandIndex];
    if (cmd) {
      if (cmd.type === 'M' || cmd.type === 'L') {
        // For M and L, pointIndex 0 is the main point
        if (updatedPoint.pointIndex === 0) {
          cmd.position = { x: updatedPoint.x, y: updatedPoint.y };
        }
      } else if (cmd.type === 'C') {
        // For C: pointIndex 0 = control1, 1 = control2, 2 = end
        if (updatedPoint.pointIndex === 0) {
          cmd.controlPoint1 = { ...cmd.controlPoint1, x: updatedPoint.x, y: updatedPoint.y };
        } else if (updatedPoint.pointIndex === 1) {
          cmd.controlPoint2 = { ...cmd.controlPoint2, x: updatedPoint.x, y: updatedPoint.y };
        } else if (updatedPoint.pointIndex === 2) {
          cmd.position = { x: updatedPoint.x, y: updatedPoint.y };
        }
      }
    }
  });

  return updatedCommands;
}

/**
 * Normalize path commands by removing invalid commands and consecutive Z commands
 */
export function normalizePathCommands(commands: Command[]): Command[] {
  if (commands.length === 0) return [];

  const normalized: Command[] = [];
  let lastWasZ = false;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];

    // Skip null or undefined commands
    if (!cmd) continue;

    // Handle Z commands - don't allow consecutive Z commands
    if (cmd.type === 'Z') {
      if (!lastWasZ) {
        normalized.push(cmd);
        lastWasZ = true;
      }
      // Skip consecutive Z commands
      continue;
    }

    // Reset Z flag for non-Z commands
    lastWasZ = false;

    // For M and L, check position
    if ((cmd.type === 'M' || cmd.type === 'L') && (!cmd.position || !isFinite(cmd.position.x) || !isFinite(cmd.position.y))) {
      continue;
    }

    // For C, check all points
    if (cmd.type === 'C') {
      if (!cmd.controlPoint1 || !isFinite(cmd.controlPoint1.x) || !isFinite(cmd.controlPoint1.y) ||
          !cmd.controlPoint2 || !isFinite(cmd.controlPoint2.x) || !isFinite(cmd.controlPoint2.y) ||
          !cmd.position || !isFinite(cmd.position.x) || !isFinite(cmd.position.y)) {
        continue;
      }
    }

    normalized.push(cmd);
  }

  // Remove trailing Z if it's the only command
  if (normalized.length === 1 && normalized[0].type === 'Z') {
    return [];
  }

  return normalized;
}

/**
 * Normalize SVG path d string by parsing, cleaning, and reconstructing
 */
export function normalizePathD(d: string): string {
  if (!d || d.trim() === '') return '';

  try {
    const commands = parsePathD(d);
    const normalizedCommands = normalizePathCommands(commands);

    if (normalizedCommands.length === 0) return '';

    return commandsToString(normalizedCommands);
  } catch (error) {
    console.warn('Error normalizing path:', error);
    return d; // Return original if normalization fails
  }
}

/**
 * Calculate the distance from a point to a line segment
 */
function pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) {
    // Line segment is a point
    return Math.sqrt(A * A + B * B);
  }

  const param = dot / lenSq;

  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Simplify points using the Ramer-Douglas-Peucker algorithm
 * This is the standard algorithm for curve simplification
 */
export function simplifyPoints(points: Array<{ x: number; y: number; commandIndex: number; pointIndex: number; isControl: boolean }>, tolerance: number = 1.0, minDistance: number = 0.1): Array<{ x: number; y: number; commandIndex: number; pointIndex: number; isControl: boolean }> {
  
  if (points.length <= 2) {
    return points;
  }

  // First pass: remove points that are too close to their neighbors
  const filteredPoints: typeof points = [];
  filteredPoints.push(points[0]); // Always keep the first point

  for (let i = 1; i < points.length; i++) {
    const prevPoint = filteredPoints[filteredPoints.length - 1];
    const currentPoint = points[i];

    // Skip control points for distance check
    if (currentPoint.isControl) {
      filteredPoints.push(currentPoint);
      continue;
    }

    const distance = Math.sqrt(
      Math.pow(currentPoint.x - prevPoint.x, 2) + 
      Math.pow(currentPoint.y - prevPoint.y, 2)
    );

    // Only keep points that are far enough from the previous retained point
    if (distance >= minDistance) {
      filteredPoints.push(currentPoint);
    }
  }

  // Don't automatically add the last point - it's already processed in the loop above

  // If we filtered out too many points, return the filtered result
  if (filteredPoints.length <= 2) {
    return filteredPoints;
  }

  // Second pass: apply RDP algorithm
  const rdpResult = simplifyPointsRDP(filteredPoints, tolerance);
  
  return rdpResult;
}

/**
 * Internal RDP simplification function
 */
function simplifyPointsRDP(points: Array<{ x: number; y: number; commandIndex: number; pointIndex: number; isControl: boolean }>, tolerance: number): Array<{ x: number; y: number; commandIndex: number; pointIndex: number; isControl: boolean }> {
  if (points.length <= 2) return points;

  // Find the point with the maximum distance from the line between start and end
  let maxDistance = 0;
  let maxIndex = 0;

  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i];

    // Skip control points for simplification
    if (point.isControl) continue;

    const distance = pointToLineDistance(point.x, point.y, start.x, start.y, end.x, end.y);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify both segments
  if (maxDistance > tolerance) {
    // Split into two segments and simplify recursively
    const leftSegment = simplifyPointsRDP(points.slice(0, maxIndex + 1), tolerance);
    const rightSegment = simplifyPointsRDP(points.slice(maxIndex), tolerance);

    // Combine results (remove duplicate point at junction)
    const result = [...leftSegment.slice(0, -1), ...rightSegment];
    return result;
  } else {
    // All intermediate points are within tolerance, keep only start and end
    return [start, end];
  }
}

/**
 * Extract subpaths from the main path commands
 */
export function extractSubpaths(commands: Command[]): { commands: SubPath; d: string; startIndex: number; endIndex: number }[] {
  const subpaths: { commands: SubPath; d: string; startIndex: number; endIndex: number }[] = [];
  let currentStart = 0;

  for (let i = 0; i < commands.length; i++) {
    if (commands[i].type === 'M' && i > 0) {
      // End previous subpath
      const subpathCommands = commands.slice(currentStart, i);
      const d = commandsToString(subpathCommands);
      subpaths.push({ commands: subpathCommands, d, startIndex: currentStart, endIndex: i - 1 });
      currentStart = i;
    }
  }

  // Last subpath
  if (currentStart < commands.length) {
    const subpathCommands = commands.slice(currentStart);
    const d = commandsToString(subpathCommands);
    subpaths.push({ commands: subpathCommands, d, startIndex: currentStart, endIndex: commands.length - 1 });
  }

  return subpaths;
}

export function commandsToString(commands: Command[]): string { 
  const result = commands.map(cmd => {
    if (cmd.type === 'Z') return 'Z';
    if (cmd.type === 'M' || cmd.type === 'L') {
      return `${cmd.type} ${formatToPrecision(cmd.position.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.position.y, PATH_DECIMAL_PRECISION)}`;
    }
    if (cmd.type === 'C') {
      return `${cmd.type} ${formatToPrecision(cmd.controlPoint1.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.controlPoint1.y, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.controlPoint2.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.controlPoint2.y, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.position.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.position.y, PATH_DECIMAL_PRECISION)}`;
    }
    return '';
  }).join(' ');
  
  return result;
}

/**
 * Determine the alignment type between two control points
 */
export function determineControlPointAlignment(
  commands: Command[],
  commandIndex1: number,
  pointIndex1: number,
  commandIndex2: number,
  pointIndex2: number,
  sharedAnchor: Point
): 'independent' | 'aligned' | 'mirrored' {
  const command1 = commands[commandIndex1];
  const command2 = commands[commandIndex2];
  
  if (!command1 || !command2 || command1.type !== 'C' || command2.type !== 'C') {
    return 'independent';
  }

  // Get the control point positions
  let point1: Point | null = null;
  let point2: Point | null = null;

  if (pointIndex1 === 0) {
    point1 = command1.controlPoint1;
  } else if (pointIndex1 === 1) {
    point1 = command1.controlPoint2;
  }

  if (pointIndex2 === 0) {
    point2 = command2.controlPoint1;
  } else if (pointIndex2 === 1) {
    point2 = command2.controlPoint2;
  }

  if (!point1 || !point2) {
    return 'independent';
  }

  // Calculate vectors from anchor to control points
  const vector1 = {
    x: point1.x - sharedAnchor.x,
    y: point1.y - sharedAnchor.y
  };
  const vector2 = {
    x: point2.x - sharedAnchor.x,
    y: point2.y - sharedAnchor.y
  };

  const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
  const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 'independent';
  }

  // Normalize vectors
  const unit1 = {
    x: vector1.x / magnitude1,
    y: vector1.y / magnitude1
  };
  const unit2 = {
    x: vector2.x / magnitude2,
    y: vector2.y / magnitude2
  };

  // Check if vectors are aligned (opposite directions)
  const dotProduct = unit1.x * (-unit2.x) + unit1.y * (-unit2.y);
  const alignmentThreshold = 0.985; // About 10 degrees tolerance

  if (dotProduct > alignmentThreshold) {
    // Vectors are aligned, check if magnitudes are similar
    const magnitudeRatio = Math.min(magnitude1, magnitude2) / Math.max(magnitude1, magnitude2);
    if (magnitudeRatio > 0.9) {
      return 'mirrored';
    } else {
      return 'aligned';
    }
  }

  return 'independent';
}

/**
 * Find the paired control point for a given control point
 */
export function findPairedControlPoint(
  commands: Command[],
  commandIndex: number,
  pointIndex: number
): { commandIndex: number; pointIndex: number; anchor: Point } | null {
  const command = commands[commandIndex];
  if (!command || command.type !== 'C' || (pointIndex !== 0 && pointIndex !== 1)) {
    return null;
  }

  // Check for control points that connect between commands
  // This happens when the end point of one command is the start of another
  if (pointIndex === 0) {
    // This is an outgoing control point, look for the incoming control point of the next command
    if (commandIndex < commands.length - 1) {
      const nextCommand = commands[commandIndex + 1];
      if (nextCommand.type === 'C') {
        // The anchor is the end point of the current command
        const anchor = command.position;
        return {
          commandIndex: commandIndex + 1,
          pointIndex: 1, // Incoming control point of next command
          anchor
        };
      }
    }
  } else if (pointIndex === 1) {
    // This is an incoming control point, look for the outgoing control point of the previous command
    if (commandIndex > 0) {
      const prevCommand = commands[commandIndex - 1];
      if (prevCommand.type === 'C') {
        // The anchor is the end point of the previous command (which should match start of current)
        const anchor = prevCommand.position;
        return {
          commandIndex: commandIndex - 1,
          pointIndex: 0, // Outgoing control point of previous command
          anchor
        };
      }
    }
  }

  return null;
}