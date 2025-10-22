import type { CanvasElement, GroupElement, PathData, Viewport } from '../../types';
import type { Bounds } from '../../utils/boundsUtils';
import { measurePath } from '../../utils/geometry';

export type ElementMap = Map<string, CanvasElement>;
export type ElementVisibilityChecker = (elementId: string) => boolean;

export const getElementBounds = (
  element: CanvasElement,
  viewport: Viewport
): Bounds | null => {
  if (element.type !== 'path') {
    return null;
  }

  const pathData = element.data as PathData;
  return measurePath(pathData.subPaths, pathData.strokeWidth, viewport.zoom);
};

export const getGroupBounds = (
  group: GroupElement,
  elementMap: ElementMap,
  viewport: Viewport,
  isElementHidden?: ElementVisibilityChecker,
  visited: Set<string> = new Set()
): Bounds | null => {
  if (visited.has(group.id)) {
    return null;
  }

  visited.add(group.id);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasBounds = false;

  group.data.childIds.forEach((childId) => {
    const child = elementMap.get(childId);
    if (!child) {
      return;
    }

    if (isElementHidden?.(child.id)) {
      return;
    }

    if (child.type === 'group') {
      const childBounds = getGroupBounds(
        child as GroupElement,
        elementMap,
        viewport,
        isElementHidden,
        visited
      );

      if (childBounds) {
        minX = Math.min(minX, childBounds.minX);
        minY = Math.min(minY, childBounds.minY);
        maxX = Math.max(maxX, childBounds.maxX);
        maxY = Math.max(maxY, childBounds.maxY);
        hasBounds = true;
      }
    } else {
      const bounds = getElementBounds(child, viewport);
      if (bounds) {
        minX = Math.min(minX, bounds.minX);
        minY = Math.min(minY, bounds.minY);
        maxX = Math.max(maxX, bounds.maxX);
        maxY = Math.max(maxY, bounds.maxY);
        hasBounds = true;
      }
    }
  });

  visited.delete(group.id);

  if (!hasBounds) {
    return null;
  }

  return { minX, minY, maxX, maxY };
};

export const measureSelectionBounds = (
  selectedIds: string[],
  elementMap: ElementMap,
  viewport: Viewport,
  isElementHidden?: ElementVisibilityChecker
): Array<{ id: string; bounds: Bounds }> => {
  const groupIds = new Set<string>();

  selectedIds.forEach((id) => {
    const element = elementMap.get(id);
    if (!element) {
      return;
    }

    if (element.type === 'group') {
      groupIds.add(element.id);
    }

    let currentParentId = element.parentId ?? null;
    const visitedAncestors = new Set<string>();

    while (currentParentId) {
      if (visitedAncestors.has(currentParentId)) {
        break;
      }

      visitedAncestors.add(currentParentId);
      const parent = elementMap.get(currentParentId);

      if (parent && parent.type === 'group') {
        groupIds.add(parent.id);
        currentParentId = parent.parentId ?? null;
      } else {
        break;
      }
    }
  });

  return Array.from(groupIds)
    .map((groupId) => {
      const group = elementMap.get(groupId);
      if (group && group.type === 'group') {
        const bounds = getGroupBounds(group as GroupElement, elementMap, viewport, isElementHidden);
        if (bounds) {
          return { id: group.id, bounds };
        }
      }
      return null;
    })
    .filter((value): value is { id: string; bounds: Bounds } => Boolean(value));
};
