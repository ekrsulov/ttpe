import type { CanvasElement, PathData } from '../types';
import { measurePath } from './measurementUtils';
import { extractSubpaths } from './pathParserUtils';

export interface Guideline {
  position: number;
  type: 'horizontal' | 'vertical';
}

export interface SnapResult {
  snappedDeltaX: number;
  snappedDeltaY: number;
  activeGuidelines: Guideline[];
}

export interface ExcludeItem {
  elementId: string;
  subpathIndex?: number;
}

/**
 * Calculate guidelines from other elements' bounding boxes and centers
 */
export function calculateGuidelines(
  elements: CanvasElement[],
  excludeItems: ExcludeItem[],
  viewportZoom: number
): Guideline[] {
  const guidelines: Guideline[] = [];

  elements.forEach(element => {
    const excludeItem = excludeItems.find(item => item.elementId === element.id);
    if (excludeItem && !excludeItem.subpathIndex) return; // Exclude entire element

    let bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

    if (element.type === 'path') {
      const pathData = element.data as PathData;

      if (excludeItem?.subpathIndex !== undefined) {
        // Calculate guidelines from each individual other subpath
        const subpaths = extractSubpaths(pathData.subPaths.flat());
        const otherSubpaths = subpaths.filter((_, index) => index !== excludeItem.subpathIndex);
        otherSubpaths.forEach(otherSp => {
          const subpathBounds = measurePath([otherSp.commands], pathData.strokeWidth || 1, viewportZoom);
          const centerX = (subpathBounds.minX + subpathBounds.maxX) / 2;
          const centerY = (subpathBounds.minY + subpathBounds.maxY) / 2;

          // Vertical guidelines
          guidelines.push({ position: subpathBounds.minX, type: 'vertical' });
          guidelines.push({ position: centerX, type: 'vertical' });
          guidelines.push({ position: subpathBounds.maxX, type: 'vertical' });

          // Horizontal guidelines
          guidelines.push({ position: subpathBounds.minY, type: 'horizontal' });
          guidelines.push({ position: centerY, type: 'horizontal' });
          guidelines.push({ position: subpathBounds.maxY, type: 'horizontal' });
        });
      } else {
        // Include entire element
        bounds = measurePath(pathData.subPaths, pathData.strokeWidth || 1, viewportZoom);
      }
    }

    if (bounds) {
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      // Vertical guidelines
      guidelines.push({ position: bounds.minX, type: 'vertical' });
      guidelines.push({ position: centerX, type: 'vertical' });
      guidelines.push({ position: bounds.maxX, type: 'vertical' });

      // Horizontal guidelines
      guidelines.push({ position: bounds.minY, type: 'horizontal' });
      guidelines.push({ position: centerY, type: 'horizontal' });
      guidelines.push({ position: bounds.maxY, type: 'horizontal' });
    }
  });

  return guidelines;
}

/**
 * Calculate snap for moving elements based on guidelines
 */
export function calculateSnap(
  deltaX: number,
  deltaY: number,
  movingBounds: { minX: number; minY: number; maxX: number; maxY: number },
  guidelines: Guideline[],
  snapThreshold: number = 8
): SnapResult {
  let snappedDeltaX = deltaX;
  let snappedDeltaY = deltaY;
  const activeGuidelines: Guideline[] = [];

  const projectedMinX = movingBounds.minX + deltaX;
  const projectedMaxX = movingBounds.maxX + deltaX;
  const projectedCenterX = (projectedMinX + projectedMaxX) / 2;

  const projectedMinY = movingBounds.minY + deltaY;
  const projectedMaxY = movingBounds.maxY + deltaY;
  const projectedCenterY = (projectedMinY + projectedMaxY) / 2;

  // Check vertical guidelines (left, center, right edges)
  const verticalPositions = [projectedMinX, projectedCenterX, projectedMaxX];

  guidelines.filter(g => g.type === 'vertical').forEach(guideline => {
    verticalPositions.forEach((pos, index) => {
      const distance = Math.abs(pos - guideline.position);
      if (distance <= snapThreshold) {
        // Snap to guideline
        const snapDelta = guideline.position - verticalPositions[index];
        if (index === 0) { // minX
          snappedDeltaX = deltaX + snapDelta;
        } else if (index === 1) { // centerX
          snappedDeltaX = deltaX + snapDelta;
        } else { // maxX
          snappedDeltaX = deltaX + snapDelta;
        }
        activeGuidelines.push(guideline);
      }
    });
  });

  // Check horizontal guidelines (top, center, bottom edges)
  const horizontalPositions = [projectedMinY, projectedCenterY, projectedMaxY];

  guidelines.filter(g => g.type === 'horizontal').forEach(guideline => {
    horizontalPositions.forEach((pos, index) => {
      const distance = Math.abs(pos - guideline.position);
      if (distance <= snapThreshold) {
        // Snap to guideline
        const snapDelta = guideline.position - horizontalPositions[index];
        if (index === 0) { // minY
          snappedDeltaY = deltaY + snapDelta;
        } else if (index === 1) { // centerY
          snappedDeltaY = deltaY + snapDelta;
        } else { // maxY
          snappedDeltaY = deltaY + snapDelta;
        }
        activeGuidelines.push(guideline);
      }
    });
  });

  return {
    snappedDeltaX,
    snappedDeltaY,
    activeGuidelines
  };
}