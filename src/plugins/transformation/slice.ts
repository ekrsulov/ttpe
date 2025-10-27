import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import { accumulateBounds } from '../../utils/measurementUtils';
import { transformCommands, calculateScaledStrokeWidth } from '../../utils/sharedTransformUtils';

export interface TransformationPluginSlice {
  // State
  transformation: {
    isTransforming: boolean;
    activeHandler: string | null;
    showCoordinates: boolean;
    showRulers: boolean;
    maintainAspectRatio: boolean;
  };

  // Actions
  updateTransformationState: (state: Partial<TransformationPluginSlice['transformation']>) => void;
  getTransformationBounds: () => { minX: number; minY: number; maxX: number; maxY: number } | null;
  isWorkingWithSubpaths: () => boolean;
  applyResizeTransform: (width: number, height: number) => void;
  applyRotationTransform: (degrees: number) => void;
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
      maintainAspectRatio: true,
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
    },

    // Apply resize transformation to selected elements or subpaths
    applyResizeTransform: (width: number, height: number) => {
      const state = get() as CanvasStore;
      const isSubpathMode = (get() as CanvasStore).isWorkingWithSubpaths?.() ?? false;
      const bounds = (get() as CanvasStore).getTransformationBounds?.();
      
      if (!bounds) return;

      const currentWidth = bounds.maxX - bounds.minX;
      const currentHeight = bounds.maxY - bounds.minY;
      
      if (currentWidth === 0 || currentHeight === 0) return;

      const scaleX = width / currentWidth;
      const scaleY = height / currentHeight;
      
      const originX = (bounds.minX + bounds.maxX) / 2;
      const originY = (bounds.minY + bounds.maxY) / 2;

      if (isSubpathMode && (state.selectedSubpaths?.length ?? 0) > 0) {
        // Apply transformation to selected subpaths
        (state.selectedSubpaths ?? []).forEach(({ elementId, subpathIndex }) => {
          const element = state.elements.find((el) => el.id === elementId);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            const newSubPaths = [...pathData.subPaths];
            
            newSubPaths[subpathIndex] = transformCommands(newSubPaths[subpathIndex], {
              scaleX,
              scaleY,
              originX,
              originY,
              rotation: 0,
              rotationCenterX: originX,
              rotationCenterY: originY
            });

            state.updateElement(elementId, {
              data: {
                ...pathData,
                subPaths: newSubPaths
              }
            });
          }
        });
      } else {
        // Apply transformation to selected elements
        state.selectedIds.forEach((id) => {
          const element = state.elements.find((el) => el.id === id);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            
            const newSubPaths = pathData.subPaths.map((subPath) =>
              transformCommands(subPath, {
                scaleX,
                scaleY,
                originX,
                originY,
                rotation: 0,
                rotationCenterX: originX,
                rotationCenterY: originY
              })
            );

            const newStrokeWidth = calculateScaledStrokeWidth(pathData.strokeWidth, scaleX, scaleY);

            state.updateElement(id, {
              data: {
                ...pathData,
                subPaths: newSubPaths,
                strokeWidth: newStrokeWidth
              }
            });
          }
        });
      }
    },

    // Apply rotation transformation to selected elements or subpaths
    applyRotationTransform: (degrees: number) => {
      const state = get() as CanvasStore;
      const isSubpathMode = (get() as CanvasStore).isWorkingWithSubpaths?.() ?? false;
      const bounds = (get() as CanvasStore).getTransformationBounds?.();
      
      if (!bounds) return;

      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      if (isSubpathMode && (state.selectedSubpaths?.length ?? 0) > 0) {
        // Apply rotation to selected subpaths
        (state.selectedSubpaths ?? []).forEach(({ elementId, subpathIndex }) => {
          const element = state.elements.find((el) => el.id === elementId);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            const newSubPaths = [...pathData.subPaths];
            
            newSubPaths[subpathIndex] = transformCommands(newSubPaths[subpathIndex], {
              scaleX: 1,
              scaleY: 1,
              originX: centerX,
              originY: centerY,
              rotation: degrees,
              rotationCenterX: centerX,
              rotationCenterY: centerY
            });

            state.updateElement(elementId, {
              data: {
                ...pathData,
                subPaths: newSubPaths
              }
            });
          }
        });
      } else {
        // Apply rotation to selected elements
        state.selectedIds.forEach((id) => {
          const element = state.elements.find((el) => el.id === id);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            
            const newSubPaths = pathData.subPaths.map((subPath) =>
              transformCommands(subPath, {
                scaleX: 1,
                scaleY: 1,
                originX: centerX,
                originY: centerY,
                rotation: degrees,
                rotationCenterX: centerX,
                rotationCenterY: centerY
              })
            );

            state.updateElement(id, {
              data: {
                ...pathData,
                subPaths: newSubPaths
              }
            });
          }
        });
      }
    }
  };
};
