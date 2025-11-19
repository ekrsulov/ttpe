import { useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { MeasurePluginSlice, MeasurePluginActions } from './slice';
import type { CanvasElement } from '../../types';
import { getAllSnapPoints } from '../../utils/snapPointUtils';
import { calculateBounds } from '../../utils/boundsUtils';

/**
 * Component that manages the snap points cache for the measure tool.
 * Refreshes the cache when entering measure mode.
 */
export const SnapPointsCache: React.FC = () => {
  const activePlugin = useCanvasStore((state) => state.activePlugin);
  const elements = useCanvasStore((state) => state.elements);
  const zoom = useCanvasStore((state) => state.viewport.zoom);
  const measureState = useCanvasStore((state) => state.measure);

  useEffect(() => {
    // Only refresh cache when entering measure mode
    if (activePlugin === 'measure') {
      const state = useCanvasStore.getState() as unknown as MeasurePluginSlice & MeasurePluginActions;

      // Helper to get element bounds
      const getElementBoundsFn = (element: CanvasElement) => {
        if (element.type !== 'path') return null;
        const pathData = element.data;
        if (!pathData?.subPaths) return null;

        // Calculate bounds manually using measurePath utility
        return calculateBounds(pathData.subPaths, pathData.strokeWidth || 0, zoom);
      };

      // Get current snap settings
      const snapSettings = {
        snapToAnchors: measureState?.snapToAnchors ?? true,
        snapToMidpoints: measureState?.snapToMidpoints ?? true,
        snapToBBoxCorners: measureState?.snapToBBoxCorners ?? true,
        snapToBBoxCenter: measureState?.snapToBBoxCenter ?? true,
        snapToIntersections: measureState?.snapToIntersections ?? true,
      };

      // Calculate all snap points using unified utilities
      // Note: edge snap is not included in cache as it's computed per-position
      const snapPoints = getAllSnapPoints(elements, getElementBoundsFn, snapSettings);

      // Store in cache
      state.refreshSnapPointsCache?.(snapPoints);
    }
  }, [activePlugin, elements, zoom, measureState?.snapToAnchors, measureState?.snapToMidpoints, measureState?.snapToBBoxCorners, measureState?.snapToBBoxCenter, measureState?.snapToIntersections]);

  return null;
};
