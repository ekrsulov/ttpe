import type { StateCreator } from 'zustand';
import type { Point } from '../../types';

export interface MeasurementData {
  startPoint: Point | null;
  endPoint: Point | null;
  distance: number;
  deltaX: number;
  deltaY: number;
  angle: number; // in degrees
  isActive: boolean;
}

export interface SnapInfo {
  point: Point;
  type: 'anchor' | 'edge' | 'midpoint' | 'bbox-corner' | 'bbox-center' | 'tangent' | 'intersection';
  elementId?: string;
}

export interface SnapPointCache {
  point: Point;
  type: SnapInfo['type'];
  elementId?: string;
}

export interface MeasurePluginSlice {
  // State
  measure: {
    measurement: MeasurementData;
    startSnapInfo: SnapInfo | null; // Snap at start point
    currentSnapInfo: SnapInfo | null; // Snap at current/end point
    cachedSnapPoints: SnapPointCache[]; // All snap points for visualization
    showInfo: boolean;
    units: 'px' | 'mm' | 'in';
    snapThreshold: number; // in screen pixels
    enableSnapping: boolean;
    showSnapPoints: boolean; // Show snap point crosses
    snapPointsOpacity: number; // Opacity of snap points (0-100)
  };

  // Actions
  updateMeasureState: (state: Partial<MeasurePluginSlice['measure']>) => void;
}

export interface MeasurePluginActions {
  startMeasurement: (point: Point, snapInfo?: SnapInfo | null) => void;
  updateMeasurement: (point: Point, snapInfo?: SnapInfo | null) => void;
  finalizeMeasurement: () => void;
  clearMeasurement: () => void;
  refreshSnapPointsCache: (snapPoints: SnapPointCache[]) => void;
}

/**
 * Calculate measurement data from two points
 */
function calculateMeasurement(start: Point, end: Point): Omit<MeasurementData, 'startPoint' | 'endPoint' | 'isActive'> {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

  return {
    distance,
    deltaX,
    deltaY,
    angle,
  };
}

export const createMeasurePluginSlice: StateCreator<
  MeasurePluginSlice & MeasurePluginActions,
  [],
  [],
  MeasurePluginSlice & MeasurePluginActions
> = (set, get) => ({
  measure: {
    measurement: {
      startPoint: null,
      endPoint: null,
      distance: 0,
      deltaX: 0,
      deltaY: 0,
      angle: 0,
      isActive: false,
    },
    startSnapInfo: null,
    currentSnapInfo: null,
    cachedSnapPoints: [],
    showInfo: true,
    units: 'px',
    snapThreshold: 10,
    enableSnapping: true,
    showSnapPoints: true,
    snapPointsOpacity: 50,
  },

  updateMeasureState: (newState) => {
    set((state) => ({
      measure: {
        ...(state as MeasurePluginSlice).measure,
        ...newState,
      },
    }));
  },

  startMeasurement: (point: Point, snapInfo: SnapInfo | null = null) => {
    set((state) => ({
      measure: {
        ...(state as MeasurePluginSlice).measure,
        measurement: {
          startPoint: point,
          endPoint: point,
          distance: 0,
          deltaX: 0,
          deltaY: 0,
          angle: 0,
          isActive: true,
        },
        startSnapInfo: snapInfo,
        currentSnapInfo: snapInfo,
      },
    }));
  },

  updateMeasurement: (point: Point, snapInfo: SnapInfo | null = null) => {
    const state = get() as MeasurePluginSlice;
    const { startPoint } = state.measure.measurement;

    if (!startPoint) return;

    const calculatedData = calculateMeasurement(startPoint, point);

    set((state) => ({
      measure: {
        ...(state as MeasurePluginSlice).measure,
        measurement: {
          startPoint,
          endPoint: point,
          ...calculatedData,
          isActive: true,
        },
        currentSnapInfo: snapInfo,
      },
    }));
  },

  finalizeMeasurement: () => {
    set((state) => ({
      measure: {
        ...(state as MeasurePluginSlice).measure,
        measurement: {
          ...(state as MeasurePluginSlice).measure.measurement,
          isActive: false,
        },
      },
    }));
  },

  clearMeasurement: () => {
    set((state) => ({
      measure: {
        ...(state as MeasurePluginSlice).measure,
        measurement: {
          startPoint: null,
          endPoint: null,
          distance: 0,
          deltaX: 0,
          deltaY: 0,
          angle: 0,
          isActive: false,
        },
        startSnapInfo: null,
        currentSnapInfo: null,
      },
    }));
  },



  refreshSnapPointsCache: (snapPoints: SnapPointCache[]) => {
    set((state) => ({
      measure: {
        ...(state as MeasurePluginSlice).measure,
        cachedSnapPoints: snapPoints,
      },
    }));
  },
});
