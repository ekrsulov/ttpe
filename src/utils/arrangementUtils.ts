/**
 * Arrangement Utilities
 * 
 * Centralized helpers for building element bounds collections used by
 * distribution and size-matching operations.
 */

import type { CanvasElement, PathData } from '../types';
import { calculateBounds } from './boundsUtils';

export interface ElementWithBounds {
  element: CanvasElement;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

/**
 * Get top-level elements from selection, replacing selected paths with their parent groups
 * When paths inside groups are selected, we work with the entire group instead
 * 
 * @param elements - All canvas elements
 * @param selectedIds - IDs of selected elements (can include paths within groups)
 * @returns Array of element IDs representing groups (for selected paths in groups) or standalone paths
 */
export function getTopLevelSelectedElements(
  elements: CanvasElement[],
  selectedIds: string[]
): string[] {
  const elementMap = new Map(elements.map(el => [el.id, el]));
  const topLevelSet = new Set<string>();

  for (const id of selectedIds) {
    const element = elementMap.get(id);
    if (!element) continue;

    // If the element has a parent, find the top-most group
    if (element.parentId) {
      let topMostGroup = element.parentId;
      let currentParentId: string | null | undefined = element.parentId;

      // Walk up the hierarchy to find the root group
      while (currentParentId) {
        const parent = elementMap.get(currentParentId);
        if (!parent) break;
        
        topMostGroup = currentParentId;
        currentParentId = parent.parentId || null;
      }

      // Add the top-most group
      topLevelSet.add(topMostGroup);
    } else {
      // Element has no parent, it's a standalone element or a root group
      topLevelSet.add(id);
    }
  }

  return Array.from(topLevelSet);
}

/**
 * Calculate bounds for a group by getting the combined bounds of all its descendants
 * 
 * @param group - The group element
 * @param elements - All canvas elements
 * @param zoom - Current zoom level
 * @returns Combined bounds of all group descendants
 */
export function calculateGroupBounds(
  group: CanvasElement,
  elements: CanvasElement[],
  zoom: number
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (group.type !== 'group') {
    return null;
  }

  const elementMap = new Map(elements.map(el => [el.id, el]));
  const descendants = collectGroupDescendants(group.id, elementMap);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const descendantId of descendants) {
    const descendant = elementMap.get(descendantId);
    if (!descendant || descendant.type !== 'path') continue;

    const pathData = descendant.data as PathData;
    const bounds = calculateBounds(
      pathData.subPaths,
      pathData.strokeWidth || 0,
      zoom,
      { includeStroke: true }
    );

    if (!isFinite(bounds.minX)) continue;

    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  }

  if (!isFinite(minX)) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Collect all descendant IDs for a group (recursively)
 * 
 * @param groupId - The group element ID
 * @param elementMap - Map of element IDs to elements
 * @returns Array of all descendant IDs
 */
function collectGroupDescendants(
  groupId: string,
  elementMap: Map<string, CanvasElement>
): string[] {
  const descendants: string[] = [];
  const group = elementMap.get(groupId);

  if (!group || group.type !== 'group') {
    return descendants;
  }

  const queue = [...group.data.childIds];

  while (queue.length > 0) {
    const childId = queue.shift();
    if (!childId) continue;

    descendants.push(childId);
    const child = elementMap.get(childId);

    if (child && child.type === 'group') {
      queue.push(...child.data.childIds);
    }
  }

  return descendants;
}

/**
 * Collect bounds for top-level selected elements (handles both groups and individual elements)
 * Uses stroke-aware bounds calculation for consistency
 * 
 * @param elements - All canvas elements
 * @param selectedIds - IDs of selected elements
 * @param zoom - Current zoom level
 * @returns Array of elements with their bounds information
 */
export function collectSelectedElementBounds(
  elements: CanvasElement[],
  selectedIds: string[],
  zoom: number
): ElementWithBounds[] {
  // Get only top-level elements (exclude children of selected groups)
  const topLevelIds = getTopLevelSelectedElements(elements, selectedIds);
  const topLevelElements = elements.filter((el: CanvasElement) => 
    topLevelIds.includes(el.id)
  );

  const elementBounds: ElementWithBounds[] = [];

  topLevelElements.forEach((el: CanvasElement) => {
    let bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

    if (el.type === 'path') {
      const pathData = el.data as PathData;
      
      // Use centralized bounds calculation with stroke support
      bounds = calculateBounds(
        pathData.subPaths,
        pathData.strokeWidth || 0,
        zoom,
        { includeStroke: true }
      );
    } else if (el.type === 'group') {
      // Calculate combined bounds for all group descendants
      bounds = calculateGroupBounds(el, elements, zoom);
    }

    if (!bounds || !isFinite(bounds.minX)) {
      return; // Skip invalid bounds
    }

    elementBounds.push({
      element: el,
      bounds,
      centerX: (bounds.minX + bounds.maxX) / 2,
      centerY: (bounds.minY + bounds.maxY) / 2,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY
    });
  });

  return elementBounds;
}
