import type { Command, PathData } from '../types';
import { extractSubpaths } from './path';
import { measureSubpathBounds } from './measurementUtils';
import { getRoundedBbox } from './comparators/bounds';
import type { SelectPanelItemData } from '../sidebar/panels/SelectPanel.types';

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
 * Get commands for a select panel item.
 * Consolidates the duplicate command-retrieval logic used in duplicate and clipboard operations.
 * 
 * @param item - Select panel item data
 * @returns Command array or null if not applicable
 */
export function getCommandsForPanelItem(item: SelectPanelItemData): Command[] | null {
  switch (item.type) {
    case 'element':
      if (item.element.type === 'path') {
        return (item.element.data as PathData).subPaths.flat();
      }
      return null;
      
    case 'subpath':
      if (item.subpathIndex !== undefined) {
        const pathData = item.element.data as PathData;
        const subpathData = extractSubpaths(pathData.subPaths.flat())[item.subpathIndex];
        return subpathData?.commands ?? null;
      }
      return null;
      
    default:
      return null;
  }
}

