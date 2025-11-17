import type { Point, Command, SubPath, ControlPoint } from '../types';
import { PATH_DECIMAL_PRECISION } from '../types';
import { formatToPrecision } from './index';
import { BEZIER_CIRCLE_KAPPA } from './bezierCircle';

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
        anchor: points[2],
        isControl: true
      };
      const controlPoint2: ControlPoint = {
        ...points[1],
        commandIndex,
        pointIndex: 1,
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
        anchor: command.position,
        isControl: false,
      });
    } else if (command.type === 'C') {
      // Get the start point for this command (needed for outgoing control point anchor)
      const startPoint = getCommandStartPoint(commands, commandIndex);

      // C has 3 points: control1 (outgoing), control2 (incoming), end
      // Control point 1 (outgoing) - anchor is the start of the segment
      points.push({
        commandIndex,
        pointIndex: 0,
        x: command.controlPoint1.x,
        y: command.controlPoint1.y,
        anchor: startPoint || { x: 0, y: 0 }, // Start point of the segment
        isControl: true,
        associatedCommandIndex: commandIndex,
        associatedPointIndex: 2, // associated with end point
      });

      // Control point 2 (incoming) - anchor is the end of the segment
      points.push({
        commandIndex,
        pointIndex: 1,
        x: command.controlPoint2.x,
        y: command.controlPoint2.y,
        anchor: command.position, // End point of the segment
        isControl: true,
        associatedCommandIndex: commandIndex,
        associatedPointIndex: 2, // associated with end point
      });

      // End point
      points.push({
        commandIndex,
        pointIndex: 2,
        x: command.position.x,
        y: command.position.y,
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
 * Note: This function only updates positions. Alignment handling should be done by the caller.
 */
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
          cmd.controlPoint1 = {
            ...cmd.controlPoint1,
            x: updatedPoint.x,
            y: updatedPoint.y
          };
        } else if (updatedPoint.pointIndex === 1) {
          cmd.controlPoint2 = {
            ...cmd.controlPoint2,
            x: updatedPoint.x,
            y: updatedPoint.y
          };
        } else if (updatedPoint.pointIndex === 2) {
          cmd.position = { x: updatedPoint.x, y: updatedPoint.y };
        }
      }
    }
  });

  return updatedCommands;
}

/**
 * Adjust control point position to match the specified alignment type
 */
export function adjustControlPointForAlignment(
  controlPoint: Point,
  pairedPoint: Point,
  anchor: Point,
  newAlignmentType: 'independent' | 'aligned' | 'mirrored'
): Point {
  // Calculate current vector from anchor to control point
  const currentVector = {
    x: controlPoint.x - anchor.x,
    y: controlPoint.y - anchor.y
  };
  const currentMagnitude = Math.sqrt(currentVector.x * currentVector.x + currentVector.y * currentVector.y);

  // Calculate vector from anchor to paired point
  const pairedVector = {
    x: pairedPoint.x - anchor.x,
    y: pairedPoint.y - anchor.y
  };
  const pairedMagnitude = Math.sqrt(pairedVector.x * pairedVector.x + pairedVector.y * pairedVector.y);

  if (newAlignmentType === 'independent') {
    // For independent, move the point slightly to break alignment if it's currently aligned
    if (currentMagnitude === 0) {
      // If point is at anchor, move it to a default position
      return {
        x: formatToPrecision(anchor.x + 20, PATH_DECIMAL_PRECISION),
        y: formatToPrecision(anchor.y, PATH_DECIMAL_PRECISION)
      };
    }

    // Check if currently aligned with paired point
    if (pairedMagnitude > 0) {
      const currentUnit = {
        x: currentVector.x / currentMagnitude,
        y: currentVector.y / currentMagnitude
      };
      const pairedUnit = {
        x: pairedVector.x / pairedMagnitude,
        y: pairedVector.y / pairedMagnitude
      };

      // Check if vectors are aligned (opposite directions)
      const dotProduct = currentUnit.x * (-pairedUnit.x) + currentUnit.y * (-pairedUnit.y);

      if (dotProduct > 0.985) { // Currently aligned
        // Move point perpendicular to break alignment
        const perpendicular = {
          x: -currentUnit.y,
          y: currentUnit.x
        };

        const offsetDistance = Math.max(10, currentMagnitude * 0.2); // 20% offset or minimum 10px

        return {
          x: formatToPrecision(controlPoint.x + perpendicular.x * offsetDistance, PATH_DECIMAL_PRECISION),
          y: formatToPrecision(controlPoint.y + perpendicular.y * offsetDistance, PATH_DECIMAL_PRECISION)
        };
      }
    }

    // If not aligned, keep current position
    return { x: controlPoint.x, y: controlPoint.y };
  }

  if (pairedMagnitude === 0) {
    // If paired point is at anchor, place control point at default position
    const defaultDistance = currentMagnitude > 0 ? currentMagnitude : 30;
    return {
      x: formatToPrecision(anchor.x + defaultDistance, PATH_DECIMAL_PRECISION),
      y: formatToPrecision(anchor.y, PATH_DECIMAL_PRECISION)
    };
  }

  // Calculate unit vector of paired point
  const pairedUnitVector = {
    x: pairedVector.x / pairedMagnitude,
    y: pairedVector.y / pairedMagnitude
  };

  // Calculate opposite direction
  const oppositeVector = {
    x: -pairedUnitVector.x,
    y: -pairedUnitVector.y
  };

  let newMagnitude: number;

  if (newAlignmentType === 'mirrored') {
    // For mirrored, use the same magnitude as the paired point
    newMagnitude = pairedMagnitude;
  } else if (newAlignmentType === 'aligned') {
    // For aligned, we need to determine a good magnitude
    // Always use a different magnitude than the paired point to make it visually distinct from mirrored

    // Use 70% of the paired point's magnitude to ensure visual distinction
    newMagnitude = pairedMagnitude * 0.7;

    // Ensure we have a reasonable minimum magnitude
    if (newMagnitude < 15) {
      newMagnitude = Math.max(pairedMagnitude * 0.5, 15); // Use 50% of paired magnitude or minimum 15px
    }

    // Ensure it's different enough to be visually distinct
    if (Math.abs(newMagnitude - pairedMagnitude) < 5) {
      newMagnitude = pairedMagnitude * 0.6; // Force more difference
    }
  } else {
    return { x: controlPoint.x, y: controlPoint.y };
  }

  return {
    x: formatToPrecision(anchor.x + oppositeVector.x * newMagnitude, PATH_DECIMAL_PRECISION),
    y: formatToPrecision(anchor.y + oppositeVector.y * newMagnitude, PATH_DECIMAL_PRECISION)
  };
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
    if (!cmd) return ''; // Guard against undefined/null commands
    if (cmd.type === 'Z') return 'Z';
    if (cmd.type === 'M' || cmd.type === 'L') {
      // Validate that position exists
      if (!cmd.position || typeof cmd.position.x !== 'number' || typeof cmd.position.y !== 'number') {
        return '';
      }
      return `${cmd.type} ${formatToPrecision(cmd.position.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.position.y, PATH_DECIMAL_PRECISION)}`;
    }
    if (cmd.type === 'C') {
      // Validate that all required properties exist
      if (!cmd.controlPoint1 || !cmd.controlPoint2 || !cmd.position ||
          typeof cmd.controlPoint1.x !== 'number' || typeof cmd.controlPoint1.y !== 'number' ||
          typeof cmd.controlPoint2.x !== 'number' || typeof cmd.controlPoint2.y !== 'number' ||
          typeof cmd.position.x !== 'number' || typeof cmd.position.y !== 'number') {
        return '';
      }
      return `${cmd.type} ${formatToPrecision(cmd.controlPoint1.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.controlPoint1.y, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.controlPoint2.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.controlPoint2.y, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.position.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.position.y, PATH_DECIMAL_PRECISION)}`;
    }
    return '';
  }).join(' ');

  return result;
}

/**
 * Determine the alignment type between two control points (internal function)
 */
function determineControlPointAlignment(
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
 * Find the paired control point for a given control point (internal function)
 */
function findPairedControlPoint(
  commands: Command[],
  commandIndex: number,
  pointIndex: number
): { commandIndex: number; pointIndex: number; anchor: Point } | null {
  const command = commands[commandIndex];
  if (!command || command.type !== 'C' || (pointIndex !== 0 && pointIndex !== 1)) {
    return null;
  }

  let pairedCommandIndex = -1;
  let pairedPointIndex = -1;
  let anchor: Point | undefined;

  if (pointIndex === 1) {
    // Incoming control point - look for next command's outgoing control point
    const nextCommandIndex = commandIndex + 1;

    // Skip Z commands
    let targetCommandIndex = nextCommandIndex;
    while (targetCommandIndex < commands.length && commands[targetCommandIndex].type === 'Z') {
      targetCommandIndex++;
    }

    if (targetCommandIndex < commands.length && commands[targetCommandIndex].type === 'C') {
      pairedCommandIndex = targetCommandIndex;
      pairedPointIndex = 0;
      anchor = command.position; // End point of current command is the anchor
    } else {
      // For closed paths (with Z command) or open paths where last point equals M point
      const hasZCommand = commands[commands.length - 1]?.type === 'Z';
      
      // Find the M command for this subpath
      let mCommandIndex = -1;
      for (let i = commandIndex; i >= 0; i--) {
        if (commands[i].type === 'M') {
          mCommandIndex = i;
          break;
        }
      }
      
      if (mCommandIndex !== -1) {
        const mPoint = (commands[mCommandIndex] as { type: 'M'; position: Point }).position;
        const currentEndPoint = command.position;
        
        // Verify that the end point matches the M point
        const tolerance = 0.1;
        const distance = Math.sqrt(
          Math.pow(currentEndPoint.x - mPoint.x, 2) +
          Math.pow(currentEndPoint.y - mPoint.y, 2)
        );
        
        // Check if path is closed (Z command or last point at M position)
        if (hasZCommand && distance < tolerance) {
          // Find first C command after M and verify it starts at M point
          for (let j = mCommandIndex + 1; j < commands.length; j++) {
            if (commands[j].type === 'C') {
              // Verify that the first C command starts at the M point
              const firstCStartPoint = getCommandStartPoint(commands, j);
              if (firstCStartPoint) {
                const startDistance = Math.sqrt(
                  Math.pow(firstCStartPoint.x - mPoint.x, 2) +
                  Math.pow(firstCStartPoint.y - mPoint.y, 2)
                );
                
                // Only pair if the first C command also starts at M point
                if (startDistance < tolerance) {
                  pairedCommandIndex = j;
                  pairedPointIndex = 0;
                  anchor = mPoint; // Use M point as anchor
                }
              }
              break;
            }
          }
        } else if (!hasZCommand && distance < tolerance) {
          // Open path but last point equals M point
          // Find first C command after M
          for (let j = mCommandIndex + 1; j < commands.length; j++) {
            if (commands[j].type === 'C') {
              pairedCommandIndex = j;
              pairedPointIndex = 0;
              anchor = mPoint; // Use M point as anchor
              break;
            }
          }
        }
      }
    }
  } else if (pointIndex === 0) {
    // Outgoing control point - look for previous command's incoming control point
    const prevCommandIndex = commandIndex - 1;

    // Skip Z commands
    let targetCommandIndex = prevCommandIndex;
    while (targetCommandIndex >= 0 && commands[targetCommandIndex].type === 'Z') {
      targetCommandIndex--;
    }

    if (targetCommandIndex >= 0 && commands[targetCommandIndex].type === 'C') {
      pairedCommandIndex = targetCommandIndex;
      pairedPointIndex = 1;
      anchor = getCommandStartPoint(commands, commandIndex) || { x: 0, y: 0 };
    } else {
      // For closed paths (with Z command) or open paths where last point equals M point
      const hasZCommand = commands[commands.length - 1]?.type === 'Z';
      
      // Find the M command for this subpath
      let mCommandIndex = -1;
      for (let i = commandIndex; i >= 0; i--) {
        if (commands[i].type === 'M') {
          mCommandIndex = i;
          break;
        }
      }
      
      if (mCommandIndex !== -1) {
        const mPoint = (commands[mCommandIndex] as { type: 'M'; position: Point }).position;
        const currentStartPoint = getCommandStartPoint(commands, commandIndex) || { x: 0, y: 0 };
        
        // Verify that the start point matches the M point (this is the first command after M)
        const tolerance = 0.1;
        const startDistance = Math.sqrt(
          Math.pow(currentStartPoint.x - mPoint.x, 2) +
          Math.pow(currentStartPoint.y - mPoint.y, 2)
        );
        
        if (startDistance < tolerance) {
          // Find last C command before Z (or before end if no Z)
          for (let j = commands.length - 1; j >= mCommandIndex + 1; j--) {
            if (commands[j].type === 'C') {
              const lastCurveEndPoint = (commands[j] as { type: 'C'; position: Point }).position;
              
              // Verify that the last curve ends at M point
              const endDistance = Math.sqrt(
                Math.pow(lastCurveEndPoint.x - mPoint.x, 2) +
                Math.pow(lastCurveEndPoint.y - mPoint.y, 2)
              );
              
              // Check if path is closed (Z command or last point at M position)
              if ((hasZCommand && endDistance < tolerance) || (!hasZCommand && endDistance < tolerance)) {
                pairedCommandIndex = j;
                pairedPointIndex = 1;
                anchor = mPoint; // Use M point as anchor
              }
              break;
            }
          }
        }
      }
    }
  }

  if (pairedCommandIndex !== -1 && anchor) {
    return {
      commandIndex: pairedCommandIndex,
      pointIndex: pairedPointIndex,
      anchor
    };
  }

  return null;
}

/**
 * Get alignment information for a control point (calculated on-demand)
 * Returns null if the point is not a control point or if it's independent
 */
export function getControlPointAlignmentInfo(
  commands: Command[],
  points: ControlPoint[],
  commandIndex: number,
  pointIndex: number
): import('../types').ControlPointAlignmentInfo | null {
  const point = points.find(p => p.commandIndex === commandIndex && p.pointIndex === pointIndex);
  
  if (!point || !point.isControl) {
    return null;
  }

  // Find the paired control point
  const pairedInfo = findPairedControlPoint(commands, commandIndex, pointIndex);
  
  if (!pairedInfo) {
    return {
      type: 'independent',
      anchor: point.anchor
    };
  }

  // Check if paired point shares the same anchor
  const tolerance = 0.1;
  const anchorDistance = Math.sqrt(
    Math.pow(point.anchor.x - pairedInfo.anchor.x, 2) +
    Math.pow(point.anchor.y - pairedInfo.anchor.y, 2)
  );

  if (anchorDistance >= tolerance) {
    return {
      type: 'independent',
      anchor: point.anchor
    };
  }

  // Calculate alignment type
  const alignmentType = determineControlPointAlignment(
    commands,
    commandIndex,
    pointIndex,
    pairedInfo.commandIndex,
    pairedInfo.pointIndex,
    pairedInfo.anchor
  );

  return {
    type: alignmentType,
    pairedCommandIndex: pairedInfo.commandIndex,
    pairedPointIndex: pairedInfo.pointIndex,
    anchor: pairedInfo.anchor
  };
}

/**
 * Helper functions for creating formatted points and commands
 */
function createFormattedPoint(x: number, y: number): Point {
  return {
    x: formatToPrecision(x, PATH_DECIMAL_PRECISION),
    y: formatToPrecision(y, PATH_DECIMAL_PRECISION)
  };
}

function createMoveCommand(x: number, y: number): Command {
  return { type: 'M', position: createFormattedPoint(x, y) };
}

function createLineCommand(x: number, y: number): Command {
  return { type: 'L', position: createFormattedPoint(x, y) };
}

/**
 * Generate shape commands directly without SVG serialization
 */
export function createSquareCommands(centerX: number, centerY: number, halfSize: number): Command[] {
  return [
    createMoveCommand(centerX - halfSize, centerY - halfSize),
    createLineCommand(centerX + halfSize, centerY - halfSize),
    createLineCommand(centerX + halfSize, centerY + halfSize),
    createLineCommand(centerX - halfSize, centerY + halfSize),
    { type: 'Z' }
  ];
}

export function createRectangleCommands(startX: number, startY: number, endX: number, endY: number): Command[] {
  return [
    createMoveCommand(startX, startY),
    createLineCommand(endX, startY),
    createLineCommand(endX, endY),
    createLineCommand(startX, endY),
    { type: 'Z' }
  ];
}

export function createLineCommands(startX: number, startY: number, endX: number, endY: number): Command[] {
  return [
    createMoveCommand(startX, startY),
    createLineCommand(endX, endY),
  ];
}

export function createDiamondCommands(centerX: number, centerY: number, halfWidth: number, halfHeight: number): Command[] {
  return [
    createMoveCommand(centerX, centerY - halfHeight), // Top point
    createLineCommand(centerX + halfWidth, centerY),   // Right point
    createLineCommand(centerX, centerY + halfHeight),  // Bottom point
    createLineCommand(centerX - halfWidth, centerY),   // Left point
    { type: 'Z' }                                     // Close path
  ];
}

export function createHeartCommands(centerX: number, centerY: number, width: number, height: number): Command[] {
  const precision = PATH_DECIMAL_PRECISION;
  
  // Heart shape based on provided path, scaled to fit the rectangle
  // Original path center: (105, 105), dimensions: 200x200
  const scaleX = width / 200;
  const scaleY = height / 200;
  const offsetX = centerX - 105 * scaleX;
  const offsetY = centerY - 105 * scaleY;

  const scaledPoint = (x: number, y: number) => ({
    x: formatToPrecision(offsetX + x * scaleX, precision),
    y: formatToPrecision(offsetY + y * scaleY, precision)
  });

  const createControlPoint = (x: number, y: number, commandIndex: number, pointIndex: number, anchorX: number, anchorY: number): ControlPoint => ({
    x: formatToPrecision(offsetX + x * scaleX, precision),
    y: formatToPrecision(offsetY + y * scaleY, precision),
    commandIndex,
    pointIndex,
    anchor: scaledPoint(anchorX, anchorY),
    isControl: true
  });

  return [
    // M 105 65
    createMoveCommand(scaledPoint(105, 65).x, scaledPoint(105, 65).y),
    // C 105 25 122 5 155 5
    {
      type: 'C',
      controlPoint1: createControlPoint(105, 25, 1, 0, 155, 5),
      controlPoint2: createControlPoint(122, 5, 1, 1, 155, 5),
      position: scaledPoint(155, 5)
    },
    // C 188 5 205 25 205 65
    {
      type: 'C',
      controlPoint1: createControlPoint(188, 5, 2, 0, 205, 65),
      controlPoint2: createControlPoint(205, 25, 2, 1, 205, 65),
      position: scaledPoint(205, 65)
    },
    // C 205 92 188 118 155 145
    {
      type: 'C',
      controlPoint1: createControlPoint(205, 92, 3, 0, 155, 145),
      controlPoint2: createControlPoint(188, 118, 3, 1, 155, 145),
      position: scaledPoint(155, 145)
    },
    // C 122 172 105 192 105 205
    {
      type: 'C',
      controlPoint1: createControlPoint(122, 172, 4, 0, 105, 205),
      controlPoint2: createControlPoint(105, 192, 4, 1, 105, 205),
      position: scaledPoint(105, 205)
    },
    // C 105 192 88 172 55 145
    {
      type: 'C',
      controlPoint1: createControlPoint(105, 192, 5, 0, 55, 145),
      controlPoint2: createControlPoint(88, 172, 5, 1, 55, 145),
      position: scaledPoint(55, 145)
    },
    // C 22 118 5 92 5 65
    {
      type: 'C',
      controlPoint1: createControlPoint(22, 118, 6, 0, 5, 65),
      controlPoint2: createControlPoint(5, 92, 6, 1, 5, 65),
      position: scaledPoint(5, 65)
    },
    // C 5 25 22 5 55 5
    {
      type: 'C',
      controlPoint1: createControlPoint(5, 25, 7, 0, 55, 5),
      controlPoint2: createControlPoint(22, 5, 7, 1, 55, 5),
      position: scaledPoint(55, 5)
    },
    // C 88 5 105 25 105 65
    {
      type: 'C',
      controlPoint1: createControlPoint(88, 5, 8, 0, 105, 65),
      controlPoint2: createControlPoint(105, 25, 8, 1, 105, 65),
      position: scaledPoint(105, 65)
    },
  ];
  }
export function createCircleCommands(centerX: number, centerY: number, radius: number): Command[] {
  const kappa = BEZIER_CIRCLE_KAPPA; // Improved control point constant for circle approximation
  const precision = PATH_DECIMAL_PRECISION;

  return [
    { type: 'M', position: { x: formatToPrecision(centerX - radius, precision), y: formatToPrecision(centerY, precision) } },
    {
      type: 'C',
      controlPoint1: {
        x: formatToPrecision(centerX - radius, precision),
        y: formatToPrecision(centerY - radius * kappa, precision),
        commandIndex: 1,
        pointIndex: 0,
        anchor: { x: formatToPrecision(centerX - radius, precision), y: formatToPrecision(centerY, precision) },
        isControl: true
      },
      controlPoint2: {
        x: formatToPrecision(centerX - radius * kappa, precision),
        y: formatToPrecision(centerY - radius, precision),
        commandIndex: 1,
        pointIndex: 1,
        anchor: { x: formatToPrecision(centerX, precision), y: formatToPrecision(centerY - radius, precision) },
        isControl: true
      },
      position: { x: formatToPrecision(centerX, precision), y: formatToPrecision(centerY - radius, precision) }
    },
    {
      type: 'C',
      controlPoint1: {
        x: formatToPrecision(centerX + radius * kappa, precision),
        y: formatToPrecision(centerY - radius, precision),
        commandIndex: 2,
        pointIndex: 0,
        anchor: { x: formatToPrecision(centerX, precision), y: formatToPrecision(centerY - radius, precision) },
        isControl: true
      },
      controlPoint2: {
        x: formatToPrecision(centerX + radius, precision),
        y: formatToPrecision(centerY - radius * kappa, precision),
        commandIndex: 2,
        pointIndex: 1,
        anchor: { x: formatToPrecision(centerX + radius, precision), y: formatToPrecision(centerY, precision) },
        isControl: true
      },
      position: { x: formatToPrecision(centerX + radius, precision), y: formatToPrecision(centerY, precision) }
    },
    {
      type: 'C',
      controlPoint1: {
        x: formatToPrecision(centerX + radius, precision),
        y: formatToPrecision(centerY + radius * kappa, precision),
        commandIndex: 3,
        pointIndex: 0,
        anchor: { x: formatToPrecision(centerX + radius, precision), y: formatToPrecision(centerY, precision) },
        isControl: true
      },
      controlPoint2: {
        x: formatToPrecision(centerX + radius * kappa, precision),
        y: formatToPrecision(centerY + radius, precision),
        commandIndex: 3,
        pointIndex: 1,
        anchor: { x: formatToPrecision(centerX, precision), y: formatToPrecision(centerY + radius, precision) },
        isControl: true
      },
      position: { x: formatToPrecision(centerX, precision), y: formatToPrecision(centerY + radius, precision) }
    },
    {
      type: 'C',
      controlPoint1: {
        x: formatToPrecision(centerX - radius * kappa, precision),
        y: formatToPrecision(centerY + radius, precision),
        commandIndex: 4,
        pointIndex: 0,
        anchor: { x: formatToPrecision(centerX, precision), y: formatToPrecision(centerY + radius, precision) },
        isControl: true
      },
      controlPoint2: {
        x: formatToPrecision(centerX - radius, precision),
        y: formatToPrecision(centerY + radius * kappa, precision),
        commandIndex: 4,
        pointIndex: 1,
        anchor: { x: formatToPrecision(centerX - radius, precision), y: formatToPrecision(centerY, precision) },
        isControl: true
      },
      position: { x: formatToPrecision(centerX - radius, precision), y: formatToPrecision(centerY, precision) }
    },
    { type: 'Z' }
  ];
}

export function createTriangleCommands(centerX: number, startY: number, endX: number, endY: number, startX: number): Command[] {
  return [
    createMoveCommand(centerX, startY),
    createLineCommand(endX, endY),
    createLineCommand(startX, endY),
    { type: 'Z' }
  ];
}