import { formatToPrecision, PATH_DECIMAL_PRECISION } from './index';

export interface Point {
  x: number;
  y: number;
}

export interface PathCommand {
  type: 'M' | 'L' | 'C' | 'Z';
  points: Point[];
}

export interface ControlPoint {
  commandIndex: number;
  pointIndex: number;
  x: number;
  y: number;
  isControl: boolean;
  associatedCommandIndex?: number;
  associatedPointIndex?: number;
}

/**
 * Parse SVG path d string into commands and points
 */
export function parsePathD(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  const tokens = d.trim().split(/[\s,]+/);

  let i = 0;
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
        const x = formatToPrecision(parseFloat(tokens[i]), PATH_DECIMAL_PRECISION);
        const y = formatToPrecision(parseFloat(tokens[i + 1]), PATH_DECIMAL_PRECISION);
        points.push({ x, y });
        i += 2;
      }
      commands.push({ type: 'M', points });
    } else if (command === 'L') {
      const points: Point[] = [];
      i++;
      while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
        const x = formatToPrecision(parseFloat(tokens[i]), PATH_DECIMAL_PRECISION);
        const y = formatToPrecision(parseFloat(tokens[i + 1]), PATH_DECIMAL_PRECISION);
        points.push({ x, y });
        i += 2;
      }
      commands.push({ type: 'L', points });
    } else if (command === 'C') {
      const points: Point[] = [];
      i++;
      while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
        const x = formatToPrecision(parseFloat(tokens[i]), PATH_DECIMAL_PRECISION);
        const y = formatToPrecision(parseFloat(tokens[i + 1]), PATH_DECIMAL_PRECISION);
        points.push({ x, y });
        i += 2;
      }
      commands.push({ type: 'C', points });
    } else if (command === 'Z') {
      commands.push({ type: 'Z', points: [] });
      i++;
    } else {
      i++;
    }
  }

  return commands;
}

/**
 * Extract all points from parsed commands for editing
 */
export function extractEditablePoints(commands: PathCommand[]): ControlPoint[] {
  const points: ControlPoint[] = [];
  let commandIndex = 0;

  for (const command of commands) {
    if (command.type === 'M') {
      // M has one point
      points.push({
        commandIndex,
        pointIndex: 0,
        x: command.points[0].x,
        y: command.points[0].y,
        isControl: false,
      });
    } else if (command.type === 'L') {
      // L has one point
      points.push({
        commandIndex,
        pointIndex: 0,
        x: command.points[0].x,
        y: command.points[0].y,
        isControl: false,
      });
    } else if (command.type === 'C') {
      // C has 3 points: control1, control2, end
      points.push({
        commandIndex,
        pointIndex: 0,
        x: command.points[0].x,
        y: command.points[0].y,
        isControl: true,
        associatedCommandIndex: commandIndex,
        associatedPointIndex: 2, // associated with end point
      });
      points.push({
        commandIndex,
        pointIndex: 1,
        x: command.points[1].x,
        y: command.points[1].y,
        isControl: true,
        associatedCommandIndex: commandIndex,
        associatedPointIndex: 2, // associated with end point
      });
      points.push({
        commandIndex,
        pointIndex: 2,
        x: command.points[2].x,
        y: command.points[2].y,
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
export function getCommandStartPoint(commands: PathCommand[], commandIndex: number): Point | null {
  if (commandIndex === 0) {
    // First command should be M
    if (commands[0].type === 'M') {
      return commands[0].points[0];
    }
    return null;
  }

  // For subsequent commands, the start point is the last point of the previous command
  const prevCommand = commands[commandIndex - 1];
  if (prevCommand.type === 'Z') {
    // Z closes to the first M point
    if (commands[0].type === 'M') {
      return commands[0].points[0];
    }
    return null;
  }

  // Get the last point of the previous command
  const lastPointIndex = prevCommand.points.length - 1;
  return prevCommand.points[lastPointIndex];
}

/**
 * Update path d string from modified points
 */
export function updatePathD(commands: PathCommand[], updatedPoints: ControlPoint[]): string {
  // Create a copy of commands to modify
  const updatedCommands = commands.map(cmd => ({
    ...cmd,
    points: [...cmd.points]
  }));

  // Apply updates to the commands
  updatedPoints.forEach(updatedPoint => {
    const cmd = updatedCommands[updatedPoint.commandIndex];
    if (cmd) {
      if (cmd.type === 'M' || cmd.type === 'L') {
        // For M and L, pointIndex 0 is the main point
        if (updatedPoint.pointIndex === 0) {
          cmd.points[0] = { x: updatedPoint.x, y: updatedPoint.y };
        }
      } else if (cmd.type === 'C') {
        // For C: pointIndex 0 = control1, 1 = control2, 2 = end
        if (updatedPoint.pointIndex >= 0 && updatedPoint.pointIndex < cmd.points.length) {
          cmd.points[updatedPoint.pointIndex] = { x: updatedPoint.x, y: updatedPoint.y };
        }
      }
    }
  });

  // Convert back to path string
  return updatedCommands.map(cmd => {
    if (cmd.type === 'Z') return 'Z';
    
    let pointStr = '';
    if (cmd.type === 'C' && cmd.points.length >= 3) {
      // For C commands, join all points with spaces
      pointStr = cmd.points.map(p => `${formatToPrecision(p.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(p.y, PATH_DECIMAL_PRECISION)}`).join(' ');
    } else {
      // For other commands, just join with spaces
      pointStr = cmd.points.map(p => `${formatToPrecision(p.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(p.y, PATH_DECIMAL_PRECISION)}`).join(' ');
    }
    
    return `${cmd.type} ${pointStr}`;
  }).join(' ');
}

/**
 * Extract subpaths from the main path commands
 */
export function extractSubpaths(commands: PathCommand[]): { d: string; startIndex: number; endIndex: number }[] {
  const subpaths: { d: string; startIndex: number; endIndex: number }[] = [];
  let currentStart = 0;

  for (let i = 0; i < commands.length; i++) {
    if (commands[i].type === 'M' && i > 0) {
      // End previous subpath
      const subpathCommands = commands.slice(currentStart, i);
      const d = commandsToString(subpathCommands);
      subpaths.push({ d, startIndex: currentStart, endIndex: i - 1 });
      currentStart = i;
    }
  }

  // Last subpath
  if (currentStart < commands.length) {
    const subpathCommands = commands.slice(currentStart);
    const d = commandsToString(subpathCommands);
    subpaths.push({ d, startIndex: currentStart, endIndex: commands.length - 1 });
  }

  return subpaths;
}

function commandsToString(commands: PathCommand[]): string {
  return commands.map(cmd => {
    const pointsStr = cmd.points.map(p => `${p.x} ${p.y}`).join(' ');
    return `${cmd.type} ${pointsStr}`;
  }).join(' ');
}

/**
 * Normalize and clean SVG path commands to remove duplicates, extra spaces, and malformed commands
 */
export function normalizePathCommands(commands: PathCommand[]): PathCommand[] {
  if (commands.length === 0) return [];

  const normalized: PathCommand[] = [];
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

    // Skip commands with no points (except Z which we already handled)
    if (cmd.points.length === 0) continue;

    // Ensure all points have valid coordinates
    const validPoints = cmd.points.filter(point =>
      !isNaN(point.x) && !isNaN(point.y) &&
      isFinite(point.x) && isFinite(point.y)
    );

    // Skip commands with no valid points
    if (validPoints.length === 0) continue;

    // Create normalized command with valid points
    const normalizedCmd: PathCommand = {
      type: cmd.type,
      points: validPoints.map(point => ({
        x: formatToPrecision(point.x, PATH_DECIMAL_PRECISION),
        y: formatToPrecision(point.y, PATH_DECIMAL_PRECISION)
      }))
    };

    normalized.push(normalizedCmd);
  }

  // Remove trailing Z if it's the only command or if the path is effectively empty
  if (normalized.length === 1 && normalized[0].type === 'Z') {
    return [];
  }

  // If we end with Z and the path is valid, keep it
  // If we have multiple trailing Z, we already removed them above

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
  console.log('=== SIMPLIFY POINTS ===');
  console.log('Input points:', points.length, 'tolerance:', tolerance, 'minDistance:', minDistance);
  
  if (points.length <= 2) {
    console.log('Not enough points to simplify, returning as-is');
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
    } else {
      console.log('Removing point', i, 'too close to previous retained point (distance:', distance.toFixed(3), '< minDistance:', minDistance, ')');
    }
  }

  // Don't automatically add the last point - it's already processed in the loop above
  console.log('After min distance filter:', filteredPoints.length, 'points (from', points.length, 'original points)');

  // If we filtered out too many points, return the filtered result
  if (filteredPoints.length <= 2) {
    console.log('After filtering, not enough points for RDP, returning filtered result');
    return filteredPoints;
  }

  // Second pass: apply RDP algorithm
  const rdpResult = simplifyPointsRDP(filteredPoints, tolerance);
  console.log('After RDP simplification:', rdpResult.length, 'points');
  
  return rdpResult;
}

/**
 * Internal RDP simplification function
 */
function simplifyPointsRDP(points: Array<{ x: number; y: number; commandIndex: number; pointIndex: number; isControl: boolean }>, tolerance: number): Array<{ x: number; y: number; commandIndex: number; pointIndex: number; isControl: boolean }> {
  console.log('Running RDP with', points.length, 'points and tolerance', tolerance);
  
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

  console.log('Max distance found:', maxDistance.toFixed(3), 'at index', maxIndex);

  // If max distance is greater than tolerance, recursively simplify both segments
  if (maxDistance > tolerance) {
    console.log('Splitting at index', maxIndex, 'and recursing...');
    // Split into two segments and simplify recursively
    const leftSegment = simplifyPointsRDP(points.slice(0, maxIndex + 1), tolerance);
    const rightSegment = simplifyPointsRDP(points.slice(maxIndex), tolerance);

    // Combine results (remove duplicate point at junction)
    const result = [...leftSegment.slice(0, -1), ...rightSegment];
    console.log('RDP result:', result.length, 'points');
    return result;
  } else {
    console.log('Max distance', maxDistance.toFixed(3), '<= tolerance', tolerance, '- keeping only start and end');
    // All intermediate points are within tolerance, keep only start and end
    return [start, end];
  }
}