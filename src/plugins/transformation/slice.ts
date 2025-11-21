import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import { accumulateBounds } from '../../utils/measurementUtils';
import { transformCommands, calculateScaledStrokeWidth } from '../../utils/sharedTransformUtils';
import { applyDistortTransform, applySkewXTransform, applySkewYTransform } from '../../utils/advancedTransformUtils';
import { getGroupBounds } from '../../canvas/geometry/CanvasGeometryService';
import type { GroupElement, PathData, CanvasElement, Point } from '../../types';

// Import transformation types
export interface TransformState {
  isTransforming: boolean;
  transformStart: Point | null;
  transformElementId: string | null;
  transformHandler: string | null;
  originalBounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  transformedBounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  initialTransform: { scaleX: number; scaleY: number; rotation: number; translateX: number; translateY: number } | null;
  originalElementData: PathData | null;
  originalElementsData?: Map<string, CanvasElement>;
}

export interface TransformFeedback {
  rotation: { degrees: number; visible: boolean; isShiftPressed: boolean; isMultipleOf15: boolean };
  resize: { deltaX: number; deltaY: number; visible: boolean; isShiftPressed: boolean; isMultipleOf10: boolean };
  shape: { width: number; height: number; visible: boolean; isShiftPressed: boolean; isMultipleOf10: boolean };
  pointPosition: { x: number; y: number; visible: boolean };
}

export interface AdvancedTransformState {
  isTransforming: boolean;
  transformType: 'distort' | 'skew' | null;
  handler: string | null;
  startPoint: Point | null;
  originalBounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  corners: { tl: Point; tr: Point; bl: Point; br: Point } | null;
  skewAxis: 'x' | 'y' | null;
  originalElements: Map<string, CanvasElement> | null;
}

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
    advancedMode: boolean;
  };

  // Runtime transformation state (updated by hooks)
  transformState?: TransformState;
  transformFeedback?: TransformFeedback;
  advancedTransformState?: AdvancedTransformState;

  // Transformation handlers (set by hooks, used by Canvas and event handlers)
  transformationHandlers?: {
    startTransformation: (elementId: string, handler: string, point: Point) => void;
    updateTransformation: (point: Point, isShiftPressed: boolean) => void;
    endTransformation: () => void;
    startAdvancedTransformation: (handler: string, point: Point, isModifierPressed: boolean) => void;
    updateAdvancedTransformation: (point: Point) => void;
    endAdvancedTransformation: () => void;
  };

  // Actions to update runtime state and handlers
  setTransformState: (state: TransformState) => void;
  setTransformFeedback: (feedback: TransformFeedback) => void;
  setAdvancedTransformState: (state: AdvancedTransformState) => void;
  setTransformationHandlers: (handlers: TransformationPluginSlice['transformationHandlers']) => void;

  // Existing actions
  updateTransformationState: (state: Partial<TransformationPluginSlice['transformation']>) => void;
  getTransformationBounds: () => { minX: number; minY: number; maxX: number; maxY: number } | null;
  isWorkingWithSubpaths: () => boolean;
  applyResizeTransform: (width: number, height: number) => void;
  applyRotationTransform: (degrees: number) => void;
  applyAdvancedDistortTransform: (newCorners: { tl: Point; tr: Point; bl: Point; br: Point }) => void;
  applyAdvancedSkewTransform: (axis: 'x' | 'y', angle: number) => void;
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
      advancedMode: false,
    },

    // Runtime state (initially undefined, set by hooks)
    transformState: undefined,
    transformFeedback: undefined,
    advancedTransformState: undefined,
    transformationHandlers: undefined,

    // Actions to update runtime state and handlers
    setTransformState: (state) => {
      set({ transformState: state });
    },

    setTransformFeedback: (feedback) => {
      set({ transformFeedback: feedback });
    },

    setAdvancedTransformState: (state) => {
      set({ advancedTransformState: state });
    },

    setTransformationHandlers: (handlers) => {
      set({ transformationHandlers: handlers });
    },

    // Actions
    updateTransformationState: (state) => {
      set((current) => ({
        transformation: { ...current.transformation, ...state },
      }));
    },

    // Check if transformation should work with subpaths instead of full elements
    isWorkingWithSubpaths: () => {
      const state = get() as unknown as CanvasStore;
      return (state.selectedSubpaths?.length ?? 0) > 0;
    },

    // Get bounds for transformation - either from selected subpaths or selected elements
    getTransformationBounds: () => {
      const state = get() as unknown as CanvasStore;
      const isSubpathMode = (get() as unknown as CanvasStore).isWorkingWithSubpaths?.() ?? false;

      if (isSubpathMode && (state.selectedSubpaths?.length ?? 0) > 0) {
        // Calculate bounds for selected subpaths
        const subpathCommandsToMeasure: import('../../types').Command[][] = [];
        let strokeWidth = 1; // Default stroke width

        (state.selectedSubpaths ?? []).forEach(({ elementId, subpathIndex }: { elementId: string; subpathIndex: number }) => {
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
      const state = get() as unknown as CanvasStore;
      const isSubpathMode = (get() as unknown as CanvasStore).isWorkingWithSubpaths?.() ?? false;
      const bounds = (get() as unknown as CanvasStore).getTransformationBounds?.();

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
        (state.selectedSubpaths ?? []).forEach(({ elementId, subpathIndex }: { elementId: string; subpathIndex: number }) => {
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
      const state = get() as unknown as CanvasStore;
      const isSubpathMode = (get() as unknown as CanvasStore).isWorkingWithSubpaths?.() ?? false;
      const bounds = (get() as unknown as CanvasStore).getTransformationBounds?.();

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
        (state.selectedSubpaths ?? []).forEach(({ elementId, subpathIndex }: { elementId: string; subpathIndex: number }) => {
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
    },

    // Apply advanced distort transformation (free-form corner movement)
    applyAdvancedDistortTransform: (newCorners: { tl: Point; tr: Point; bl: Point; br: Point }) => {
      const state = get() as unknown as CanvasStore;
      const isSubpathMode = (get() as unknown as CanvasStore).isWorkingWithSubpaths?.() ?? false;
      const bounds = (get() as unknown as CanvasStore).getTransformationBounds?.();

      if (!bounds) return;

      if (isSubpathMode && (state.selectedSubpaths?.length ?? 0) > 0) {
        // Apply transformation to selected subpaths
        (state.selectedSubpaths ?? []).forEach(({ elementId, subpathIndex }: { elementId: string; subpathIndex: number }) => {
          const element = state.elements.find((el) => el.id === elementId);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            const newSubPaths = [...pathData.subPaths];

            newSubPaths[subpathIndex] = applyDistortTransform(newSubPaths[subpathIndex], bounds, newCorners);

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
            // For groups, transform all descendants
            const group = element as GroupElement;
            const visited = new Set<string>();

            const transformDescendantsDistort = (grp: GroupElement) => {
              if (visited.has(grp.id)) return;
              visited.add(grp.id);

              grp.data.childIds.forEach((childId) => {
                const child = elementMap.get(childId);
                if (!child) return;

                if (child.type === 'group') {
                  transformDescendantsDistort(child as GroupElement);
                } else if (child.type === 'path') {
                  const pathData = child.data as PathData;
                  const newSubPaths = pathData.subPaths.map((subPath) =>
                    applyDistortTransform(subPath, bounds, newCorners)
                  );

                  state.updateElement(child.id, {
                    data: {
                      ...pathData,
                      subPaths: newSubPaths
                    }
                  });
                }
              });
            };

            transformDescendantsDistort(group);
          } else if (element.type === 'path') {
            // Transform path element
            const pathData = element.data as import('../../types').PathData;

            const newSubPaths = pathData.subPaths.map((subPath) =>
              applyDistortTransform(subPath, bounds, newCorners)
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
    },

    // Apply advanced skew transformation
    applyAdvancedSkewTransform: (axis: 'x' | 'y', angle: number) => {
      const state = get() as unknown as CanvasStore;
      const isSubpathMode = (get() as unknown as CanvasStore).isWorkingWithSubpaths?.() ?? false;
      const bounds = (get() as unknown as CanvasStore).getTransformationBounds?.();

      if (!bounds) return;

      const originX = (bounds.minX + bounds.maxX) / 2;
      const originY = (bounds.minY + bounds.maxY) / 2;

      if (isSubpathMode && (state.selectedSubpaths?.length ?? 0) > 0) {
        // Apply transformation to selected subpaths
        (state.selectedSubpaths ?? []).forEach(({ elementId, subpathIndex }: { elementId: string; subpathIndex: number }) => {
          const element = state.elements.find((el) => el.id === elementId);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../../types').PathData;
            const newSubPaths = [...pathData.subPaths];

            newSubPaths[subpathIndex] = axis === 'x'
              ? applySkewXTransform(newSubPaths[subpathIndex], angle, originY)
              : applySkewYTransform(newSubPaths[subpathIndex], angle, originX);

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
            // For groups, transform all descendants
            const group = element as GroupElement;
            const visited = new Set<string>();

            const transformDescendantsSkew = (grp: GroupElement) => {
              if (visited.has(grp.id)) return;
              visited.add(grp.id);

              grp.data.childIds.forEach((childId) => {
                const child = elementMap.get(childId);
                if (!child) return;

                if (child.type === 'group') {
                  transformDescendantsSkew(child as GroupElement);
                } else if (child.type === 'path') {
                  const pathData = child.data as PathData;
                  const newSubPaths = pathData.subPaths.map((subPath) =>
                    axis === 'x'
                      ? applySkewXTransform(subPath, angle, originY)
                      : applySkewYTransform(subPath, angle, originX)
                  );

                  state.updateElement(child.id, {
                    data: {
                      ...pathData,
                      subPaths: newSubPaths
                    }
                  });
                }
              });
            };

            transformDescendantsSkew(group);
          } else if (element.type === 'path') {
            // Transform path element
            const pathData = element.data as import('../../types').PathData;

            const newSubPaths = pathData.subPaths.map((subPath) =>
              axis === 'x'
                ? applySkewXTransform(subPath, angle, originY)
                : applySkewYTransform(subPath, angle, originX)
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
