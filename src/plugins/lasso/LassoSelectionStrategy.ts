import type { Point } from '../../types';
import type { SelectionStrategy, SelectionData } from '../../canvas/selection/SelectionStrategy';
import { isPointInPolygon, isBoundsIntersectingPolygon } from './lassoGeometry';

/**
 * Lasso selection strategy - selects items within a free-form drawn path
 */
export class LassoSelectionStrategy implements SelectionStrategy {
  id = 'lasso';

  containsPoint(point: Point, selectionData: SelectionData): boolean {
    if (!selectionData.path || selectionData.path.length < 3) {
      return false;
    }
    return isPointInPolygon(point, selectionData.path);
  }

  intersectsBounds(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    selectionData: SelectionData
  ): boolean {
    if (!selectionData.path || selectionData.path.length < 3) {
      return false;
    }
    return isBoundsIntersectingPolygon(bounds, selectionData.path);
  }
}
