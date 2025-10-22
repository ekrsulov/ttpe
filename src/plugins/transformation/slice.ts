import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import { accumulateBounds } from '../../utils/measurementUtils';

export interface TransformationPluginSlice {
  // State
  transformation: {
    isTransforming: boolean;
    activeHandler: string | null;
    showCoordinates: boolean;
    showRulers: boolean;
  };

  // Actions
  updateTransformationState: (state: Partial<TransformationPluginSlice['transformation']>) => void;
  getTransformationBounds: () => { minX: number; minY: number; maxX: number; maxY: number } | null;
  isWorkingWithSubpaths: () => boolean;
}

export const createTransformationPluginSlice: StateCreator<
  TransformationPluginSlice,
  [],
  [],
  TransformationPluginSlice
> = (set, get) => {
  return {
    // Initial state
    transformation: {
      isTransforming: false,
      activeHandler: null,
      showCoordinates: false,
      showRulers: false,
    },

    // Actions
    updateTransformationState: (state) => {
      set((current) => ({
        transformation: { ...current.transformation, ...state },
      }));
    },

    // Check if transformation should work with subpaths instead of full elements
    isWorkingWithSubpaths: () => {
      const state = get() as CanvasStore;
      return (state.selectedSubpaths?.length ?? 0) > 0;
    },

    // Get bounds for transformation - either from selected subpaths or selected elements
    getTransformationBounds: () => {
      const state = get() as CanvasStore;
      const isSubpathMode = (get() as CanvasStore).isWorkingWithSubpaths?.() ?? false;

      if (isSubpathMode && (state.selectedSubpaths?.length ?? 0) > 0) {
        // Calculate bounds for selected subpaths
        const subpathCommandsToMeasure: import('../../types').Command[][] = [];
        let strokeWidth = 1; // Default stroke width

        (state.selectedSubpaths ?? []).forEach(({ elementId, subpathIndex }) => {
          const element = state.elements.find((el) => el.id === elementId);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            if (subpathIndex < pathData.subPaths.length) {
              subpathCommandsToMeasure.push(pathData.subPaths[subpathIndex]);
              strokeWidth = pathData.strokeWidth; // Use stroke width from the path
            }
          }
        });

        if (subpathCommandsToMeasure.length === 0) return null;

        return accumulateBounds(subpathCommandsToMeasure, strokeWidth, state.viewport.zoom);
      } else {
        // Calculate bounds for selected elements
        const elementCommandsToMeasure: import('../../types').Command[][] = [];
        let commonStrokeWidth = 1;

        state.selectedIds.forEach((id) => {
          const element = state.elements.find((el) => el.id === id);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            pathData.subPaths.forEach((commands) => {
              elementCommandsToMeasure.push(commands);
            });
            commonStrokeWidth = pathData.strokeWidth;
          }
        });

        if (elementCommandsToMeasure.length === 0) return null;

        return accumulateBounds(elementCommandsToMeasure, commonStrokeWidth, state.viewport.zoom);
      }
    }
  };
};
