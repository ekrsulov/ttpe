export interface PathCommand {
  type: 'M' | 'L' | 'C' | 'Z';
  points: Point[];
}

export interface Point {
  x: number;
  y: number;
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
        const x = parseFloat(tokens[i]);
        const y = parseFloat(tokens[i + 1]);
        points.push({ x, y });
        i += 2;
      }
      commands.push({ type: 'M', points });
    } else if (command === 'L') {
      const points: Point[] = [];
      i++;
      while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
        const x = parseFloat(tokens[i]);
        const y = parseFloat(tokens[i + 1]);
        points.push({ x, y });
        i += 2;
      }
      commands.push({ type: 'L', points });
    } else if (command === 'C') {
      const points: Point[] = [];
      i++;
      while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
        const x = parseFloat(tokens[i]);
        const y = parseFloat(tokens[i + 1]);
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
    const pointStr = cmd.points.map(p => `${p.x} ${p.y}`).join(' ');
    return `${cmd.type} ${pointStr}`;
  }).join(' ');
}