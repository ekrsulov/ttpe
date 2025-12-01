import type { StateCreator } from 'zustand';
import type { CanvasElement, Point } from '../../types';
import type { SnapPoint } from '../../utils/snapPointUtils';
import { 
  getAllSnapPoints, 
  findClosestSnapPoint,
  findEdgeSnapPoint,
  screenDistance
} from '../../utils/snapPointUtils';
import { calculateBounds } from '../../utils/boundsUtils';

export type { SnapPoint };

export interface ObjectSnapState {
  enabled: boolean;
  snapThreshold: number; // in screen pixels
  currentSnapPoint: SnapPoint | null;
  availableSnapPoints: SnapPoint[];
  snapToAnchors: boolean;
  snapToMidpoints: boolean;
  snapToEdges: boolean;
  snapToBBoxCorners: boolean;
  snapToBBoxCenter: boolean;
  snapToIntersections: boolean;
  showSnapPoints: boolean; // Show all snap points while dragging
  snapPointsOpacity: number; // Opacity 0-100
  // Cache
  cachedSnapPoints: SnapPoint[] | null;
  cacheKey: string | null; // Hash of elements to detect changes
}

// All snap point extraction logic is now in utils/snapPointUtils.ts

export const createObjectSnapPluginSlice: StateCreator<
  ObjectSnapPluginSlice,
  [],
  [],
  ObjectSnapPluginSlice
> = (set, get) => {
  return {
    // Initial state
    objectSnap: {
      enabled: false,
      snapThreshold: 8, // 8 pixels default in screen space
      currentSnapPoint: null,
      availableSnapPoints: [],
      snapToAnchors: true,
      snapToMidpoints: true,
      snapToEdges: true,
      snapToBBoxCorners: true,
      snapToBBoxCenter: true,
      snapToIntersections: true,
      showSnapPoints: false,
      snapPointsOpacity: 50,
      cachedSnapPoints: null,
      cacheKey: null,
    },

    // Actions
    updateObjectSnapState: (updates) => {
    set((state) => {
      const newState = {
        objectSnap: {
          ...state.objectSnap,
          ...updates,
        },
      };
      
      // Invalidate cache if snap type options change
      if ('snapToAnchors' in updates || 
          'snapToMidpoints' in updates || 
          'snapToEdges' in updates ||
          'snapToBBoxCorners' in updates ||
          'snapToBBoxCenter' in updates ||
          'snapToIntersections' in updates) {
        newState.objectSnap.cachedSnapPoints = null;
        newState.objectSnap.cacheKey = null;
      }
      
      return newState;
    });
  },
  
  invalidateObjectSnapCache: () => {
    set((state) => ({
      objectSnap: {
        ...state.objectSnap,
        cachedSnapPoints: null,
        cacheKey: null,
        // Also clear availableSnapPoints to prevent flash of stale data
        availableSnapPoints: [],
      },
    }));
  },

  findAvailableSnapPoints: (excludeElementIds) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = get() as any;
    const elements = state.elements as CanvasElement[];
    const objectSnap = state.objectSnap;
    
    // Generate cache key from elements (excluding the ones being edited)
    const relevantElements = elements.filter((el: CanvasElement) => 
      !excludeElementIds.includes(el.id) && 
      el.type === 'path' &&
      (!state.isElementHidden || !state.isElementHidden(el.id))
    );
    
    const cacheKey = relevantElements
      .map((el: CanvasElement) => el.id)
      .sort()
      .join('|');
    
    // Check if cache is valid
    if (objectSnap?.cachedSnapPoints && objectSnap.cacheKey === cacheKey) {
      return objectSnap.cachedSnapPoints;
    }
    
    // Get bounds function - same as measure plugin
    const getElementBounds = (element: CanvasElement) => {
      if (element.type !== 'path') return null;
      const pathData = element.data;
      if (!pathData?.subPaths) return null;
      
      // Get zoom from viewport
      const viewport = state.viewport as { zoom: number } | undefined;
      const zoom = viewport?.zoom ?? 1;
      
      return calculateBounds(pathData.subPaths, pathData.strokeWidth || 0, zoom);
    };
    
    // Use unified snap point utilities
    const snapPoints = getAllSnapPoints(relevantElements, getElementBounds, {
      snapToAnchors: objectSnap?.snapToAnchors ?? true,
      snapToMidpoints: objectSnap?.snapToMidpoints ?? true,
      snapToBBoxCorners: objectSnap?.snapToBBoxCorners ?? true,
      snapToBBoxCenter: objectSnap?.snapToBBoxCenter ?? true,
      snapToIntersections: objectSnap?.snapToIntersections ?? true,
    });
    
    // Update cache
    set((current) => ({
      objectSnap: {
        ...current.objectSnap,
        cachedSnapPoints: snapPoints,
        cacheKey,
        availableSnapPoints: snapPoints,
      },
    }));
    
    return snapPoints;
  },

  findClosestSnapPoint: (position, availableSnapPoints, threshold) => {
    // Use unified utility - threshold is already in canvas units
    // We need to pass zoom = 1 since threshold is already in canvas space
    return findClosestSnapPoint(position, availableSnapPoints, threshold, 1);
  },

  applyObjectSnap: (position, excludeElementIds) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = get() as any;
    
    // If object snap is disabled, return original position
    if (!state.objectSnap?.enabled) {
      return position;
    }
    
    // Get viewport to convert threshold from screen pixels to canvas coordinates
    const viewport = state.viewport as { zoom: number } | undefined;
    const zoom = viewport?.zoom ?? 1;
    
    // Convert threshold from screen pixels to canvas coordinates
    const thresholdInCanvas = state.objectSnap.snapThreshold / zoom;
    
    // Find available snap points (anchors, midpoints, bbox, intersections)
    // These have PRIORITY over edge snap
    const availableSnapPoints = state.findAvailableSnapPoints ? 
      state.findAvailableSnapPoints(excludeElementIds) : [];
    
    // Find closest high-priority snap point
    let closestSnap = state.findClosestSnapPoint ? 
      state.findClosestSnapPoint(position, availableSnapPoints, thresholdInCanvas) : null;
    let closestDistance = closestSnap ? screenDistance(position, closestSnap.point, zoom) : Infinity;
    
    // Only check edge snap if enabled AND no high-priority snap found within threshold
    if (state.objectSnap?.snapToEdges && !closestSnap) {
      const elements = state.elements as CanvasElement[];
      const relevantElements = elements.filter((el: CanvasElement) => 
        !excludeElementIds.includes(el.id) && 
        el.type === 'path' &&
        (!state.isElementHidden || !state.isElementHidden(el.id))
      );
      
      // Check edge snap for each element
      for (const element of relevantElements) {
        const edgeSnap = findEdgeSnapPoint(position, element, state.objectSnap.snapThreshold, zoom);
        if (edgeSnap) {
          const dist = screenDistance(position, edgeSnap.point, zoom);
          if (dist < closestDistance) {
            closestDistance = dist;
            closestSnap = edgeSnap;
          }
        }
      }
    }
    
    // Update current snap point for visualization
    set((current) => ({
      objectSnap: {
        ...current.objectSnap,
        currentSnapPoint: closestSnap,
        availableSnapPoints,
      },
    }));
    
    // Return snapped position if found, otherwise original
    if (closestSnap) {
      return closestSnap.point;
    }
    
    return position;
  },
  };
};

export interface ObjectSnapPluginSlice {
  objectSnap: ObjectSnapState;
  updateObjectSnapState: (updates: Partial<ObjectSnapState>) => void;
  invalidateObjectSnapCache: () => void;
  findAvailableSnapPoints: (excludeElementIds: string[]) => SnapPoint[];
  findClosestSnapPoint: (
    position: Point,
    availableSnapPoints: SnapPoint[],
    threshold: number
  ) => SnapPoint | null;
  applyObjectSnap: (position: Point, excludeElementIds: string[]) => Point;
}
