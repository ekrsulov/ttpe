import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import { accumulateBounds } from '../../utils/measurementUtils';
import { transformCommands, calculateScaledStrokeWidth } from '../../utils/sharedTransformUtils';
import { getGroupBounds } from '../../canvas/geometry/CanvasGeometryService';
import type { GroupElement, PathData, CanvasElement } from '../../types';

/**
 * Helper function to transform all descendants of a group recursively
 */
function transformGroupDescendants(
  group: GroupElement,
  elementMap: Map<string, CanvasElement>,
  updateElement: (id: string, updates: Partial<CanvasElement>) => void,
  transform: {
    scaleX: number;
    scaleY: number;
    originX: number;
    originY: number;
    rotation: number;
    rotationCenterX: number;
    rotationCenterY: number;
  },
  visited: Set<string> = new Set()
): void {
  if (visited.has(group.id)) return;
  visited.add(group.id);

  group.data.childIds.forEach((childId) => {
    const child = elementMap.get(childId);
    if (!child) return;

    if (child.type === 'group') {
      // Recursively transform nested groups
      transformGroupDescendants(child as GroupElement, elementMap, updateElement, transform, visited);
    } else if (child.type === 'path') {
      // Transform path element
      const pathData = child.data as PathData;
      
      const newSubPaths = pathData.subPaths.map((subPath) =>
        transformCommands(subPath, transform)
      );

      const newStrokeWidth = calculateScaledStrokeWidth(
        pathData.strokeWidth,
        transform.scaleX,
        transform.scaleY
      );

      updateElement(child.id, {
        data: {
          ...pathData,
          subPaths: newSubPaths,
          strokeWidth: newStrokeWidth
        }
      });
    }
  });

  visited.delete(group.id);
}

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
        // Calculate bounds for selected elements (paths and groups)
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let hasBounds = false;

        // Create element map for group bounds calculation
        const elementMap = new Map(state.elements.map(el => [el.id, el]));

        state.selectedIds.forEach((id) => {
          const element = state.elements.find((el) => el.id === id);
          if (!element) return;

          let bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

          if (element.type === 'path') {
            // For paths, accumulate bounds from subpaths
            const pathData = element.data as import('../../types').PathData;
            bounds = accumulateBounds(pathData.subPaths, pathData.strokeWidth, state.viewport.zoom);
          } else if (element.type === 'group') {
            // For groups, use getGroupBounds
            bounds = getGroupBounds(element as GroupElement, elementMap, state.viewport);
          }

          if (bounds) {
            minX = Math.min(minX, bounds.minX);
            minY = Math.min(minY, bounds.minY);
            maxX = Math.max(maxX, bounds.maxX);
            maxY = Math.max(maxY, bounds.maxY);
            hasBounds = true;
          }
        });

        if (!hasBounds) return null;

        return { minX, minY, maxX, maxY };
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

      const transform = {
        scaleX,
        scaleY,
        originX,
        originY,
        rotation: 0,
        rotationCenterX: originX,
        rotationCenterY: originY
      };

      if (isSubpathMode && (state.selectedSubpaths?.length ?? 0) > 0) {
        // Apply transformation to selected subpaths
        (state.selectedSubpaths ?? []).forEach(({ elementId, subpathIndex }) => {
          const element = state.elements.find((el) => el.id === elementId);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            const newSubPaths = [...pathData.subPaths];
            
            newSubPaths[subpathIndex] = transformCommands(newSubPaths[subpathIndex], transform);

            state.updateElement(elementId, {
              data: {
                ...pathData,
                subPaths: newSubPaths
              }
            });
          }
        });
      } else {
        // Apply transformation to selected elements (paths and groups)
        const elementMap = new Map(state.elements.map(el => [el.id, el]));

        state.selectedIds.forEach((id) => {
          const element = state.elements.find((el) => el.id === id);
          if (!element) return;

          if (element.type === 'group') {
            // Transform all descendants of the group
            transformGroupDescendants(element as GroupElement, elementMap, state.updateElement, transform);
          } else if (element.type === 'path') {
            // Transform path element
            const pathData = element.data as import('../../types').PathData;
            
            const newSubPaths = pathData.subPaths.map((subPath) =>
              transformCommands(subPath, transform)
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

      const transform = {
        scaleX: 1,
        scaleY: 1,
        originX: centerX,
        originY: centerY,
        rotation: degrees,
        rotationCenterX: centerX,
        rotationCenterY: centerY
      };

      if (isSubpathMode && (state.selectedSubpaths?.length ?? 0) > 0) {
        // Apply rotation to selected subpaths
        (state.selectedSubpaths ?? []).forEach(({ elementId, subpathIndex }) => {
          const element = state.elements.find((el) => el.id === elementId);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            const newSubPaths = [...pathData.subPaths];
            
            newSubPaths[subpathIndex] = transformCommands(newSubPaths[subpathIndex], transform);

            state.updateElement(elementId, {
              data: {
                ...pathData,
                subPaths: newSubPaths
              }
            });
          }
        });
      } else {
        // Apply rotation to selected elements (paths and groups)
        const elementMap = new Map(state.elements.map(el => [el.id, el]));

        state.selectedIds.forEach((id) => {
          const element = state.elements.find((el) => el.id === id);
          if (!element) return;

          if (element.type === 'group') {
            // Transform all descendants of the group (rotation only, no scaling)
            const rotationTransform = {
              ...transform,
              scaleX: 1,
              scaleY: 1
            };
            transformGroupDescendants(element as GroupElement, elementMap, state.updateElement, rotationTransform);
          } else if (element.type === 'path') {
            // Transform path element
            const pathData = element.data as import('../../types').PathData;
            
            const newSubPaths = pathData.subPaths.map((subPath) =>
              transformCommands(subPath, transform)
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
