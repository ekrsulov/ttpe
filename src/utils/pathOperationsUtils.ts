import type { PathData, SubPath, Command } from '../types';

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