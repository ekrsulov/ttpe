import { useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { MeasurePluginSlice, MeasurePluginActions } from './slice';
import type { CanvasElement } from '../../types';
import { getAllSnapPoints } from './snapUtils';
import { calculateBounds } from '../../utils/boundsUtils';

/**
 * Component that manages the snap points cache for the measure tool.
 * Refreshes the cache when entering measure mode.
 */
export const SnapPointsCache: React.FC = () => {
  const activePlugin = useCanvasStore((state) => state.activePlugin);
  const elements = useCanvasStore((state) => state.elements);
  const zoom = useCanvasStore((state) => state.viewport.zoom);

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

      // Calculate all snap points
      const snapPoints = getAllSnapPoints(elements, getElementBoundsFn);
      
      // Store in cache
      state.refreshSnapPointsCache?.(snapPoints);
    }
  }, [activePlugin, elements, zoom]);

  return null;
};
