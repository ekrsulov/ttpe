/**
 * Element Update Batching Utilities
 * 
 * Helper functions for batching and applying point updates across
 * drag and snap phases. Reduces code duplication in drag handlers
 * and ensures consistent update patterns.
 */

import type { Command } from '../types';

export interface PointUpdate {
  commandIndex: number;
  pointIndex: number;
  x: number;
  y: number;
  isControl: boolean;
}

export interface ElementUpdate {
  elementId: string;
  updates: PointUpdate[];
}

/**
 * Apply a batch of point updates to commands, creating new command arrays.
 * This is used to transform commands based on drag deltas or snap adjustments.
 * 
 * @param originalCommands - Original command array
 * @param updates - Array of point updates to apply
 * @returns New command array with updates applied
 */
export function applyPointUpdatesToCommands(
  originalCommands: Command[],
  updates: PointUpdate[]
): Command[] {
  // Clone the commands array with proper type handling
  const newCommands = originalCommands.map(cmd => {
    if (cmd.type === 'M' || cmd.type === 'L') {
      return { ...cmd, position: { ...cmd.position } };
    } else if (cmd.type === 'C') {
      return {
        ...cmd,
        position: { ...cmd.position },
        controlPoint1: { ...cmd.controlPoint1 },
        controlPoint2: { ...cmd.controlPoint2 },
      };
    } else {
      return { ...cmd };
    }
  });

  // Apply each update
  updates.forEach((update) => {
    const cmd = newCommands[update.commandIndex];
    if (!cmd || cmd.type === 'Z') return;

    if (update.isControl) {
      // Update control point
      if (cmd.type === 'C') {
        if (update.pointIndex === 1) {
          cmd.controlPoint1 = { 
            ...cmd.controlPoint1,
            x: update.x,
            y: update.y,
          };
        } else if (update.pointIndex === 2) {
          cmd.controlPoint2 = {
            ...cmd.controlPoint2,
            x: update.x,
            y: update.y,
          };
        }
      }
    } else {
      // Update main position
      cmd.position = { ...cmd.position, x: update.x, y: update.y };
    }
  });

  return newCommands;
}

/**
 * Build a map of element updates from a list of point movements.
 * Groups updates by element ID for efficient batch processing.
 * 
 * @param pointInfos - Array of point information with elementId and coordinates
 * @param deltaX - X delta to apply
 * @param deltaY - Y delta to apply
 * @returns Map of element ID to updates array
 */
export function buildElementUpdatesMap(
  pointInfos: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
    isControl?: boolean;
  }>,
  deltaX: number,
  deltaY: number
): Map<string, PointUpdate[]> {
  const elementUpdates = new Map<string, PointUpdate[]>();

  pointInfos.forEach((info) => {
    if (!elementUpdates.has(info.elementId)) {
      elementUpdates.set(info.elementId, []);
    }

    elementUpdates.get(info.elementId)!.push({
      commandIndex: info.commandIndex,
      pointIndex: info.pointIndex,
      x: info.x + deltaX,
      y: info.y + deltaY,
      isControl: info.isControl ?? false,
    });
  });

  return elementUpdates;
}

/**
 * Merge two update maps together.
 * Useful when combining initial drag updates with snap adjustment updates.
 * 
 * @param map1 - First update map
 * @param map2 - Second update map (takes precedence for conflicting updates)
 * @returns Merged update map
 */
export function mergeElementUpdates(
  map1: Map<string, PointUpdate[]>,
  map2: Map<string, PointUpdate[]>
): Map<string, PointUpdate[]> {
  const merged = new Map(map1);

  map2.forEach((updates, elementId) => {
    if (merged.has(elementId)) {
      // Merge updates, with map2 taking precedence
      const existing = merged.get(elementId)!;
      const combined = [...existing];

      updates.forEach((update) => {
        const existingIndex = combined.findIndex(
          (u) =>
            u.commandIndex === update.commandIndex &&
            u.pointIndex === update.pointIndex &&
            u.isControl === update.isControl
        );

        if (existingIndex >= 0) {
          combined[existingIndex] = update;
        } else {
          combined.push(update);
        }
      });

      merged.set(elementId, combined);
    } else {
      merged.set(elementId, updates);
    }
  });

  return merged;
}
