import type { Command, PathData } from '../types';
import { extractSubpaths } from './path';
import { measureSubpathBounds } from './measurementUtils';
import { getRoundedBbox } from './comparators/bounds';

/**
 * Interface for thumbnail data used by Select panel items
 */
export interface ItemThumbnailData {
  commands: Command[];
  strokeWidth: number;
  bbox: { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number } } | null;
}

/**
 * Extract thumbnail commands and compute stroke-aware bounds for a panel item.
 * Consolidates the duplicate logic from SelectPanelItem and SelectPanelGroupItem.
 * 
 * @param itemType - Type of item ('element' or 'subpath')
 * @param pathData - Path data from the element
 * @param subpathIndex - Optional subpath index for subpath items
 * @returns Object containing commands, strokeWidth, and computed bbox
 */
export function getItemThumbnailData(
  itemType: 'element' | 'subpath',
  pathData: PathData,
  subpathIndex?: number
): ItemThumbnailData {
  let commands: Command[] = [];
  const strokeWidth = pathData.strokeWidth ?? 1;

  if (itemType === 'element') {
    // Full element: use all commands from all subpaths
    commands = pathData.subPaths.flat();
  } else if (itemType === 'subpath' && subpathIndex !== undefined) {
    // Single subpath: extract specific subpath commands
    const subpathData = extractSubpaths(pathData.subPaths.flat())[subpathIndex];
    if (subpathData) {
      commands = subpathData.commands;
    }
  }

  // Compute stroke-aware bounds
  const boundsResult = commands.length > 0
    ? measureSubpathBounds(commands, strokeWidth, 1)
    : null;
  const bbox = getRoundedBbox(boundsResult);

  return {
    commands,
    strokeWidth,
    bbox,
  };
}

/**
 * Compute stroke-aware bounds for comparison purposes.
 * Used in memo comparison functions to detect meaningful changes.
 * 
 * @param commands - Path commands to measure
 * @param strokeWidth - Stroke width to include in bounds
 * @returns Rounded bbox or null if commands are empty
 */
export function computeStrokeAwareBounds(
  commands: Command[],
  strokeWidth: number
): { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number } } | null {
  if (commands.length === 0) {
    return null;
  }

  const boundsResult = measureSubpathBounds(commands, strokeWidth, 1);
  return getRoundedBbox(boundsResult);
}
