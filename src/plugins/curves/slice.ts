import type { StateCreator } from 'zustand';
import type { CurveState, CurvePoint } from '../../types';

export interface CurvesPluginSlice {
  // Configuración de la herramienta
  curves: Record<string, never>; // Empty object type

  // Estado de la curva actual
  curveState: CurveState;

  // Actions
  setCurveState: (state: CurveState) => void;
  addCurvePoint: (point: Omit<CurvePoint, 'id'>) => void;
  updateCurvePoint: (id: string, updates: Partial<CurvePoint>) => void;
  deleteCurvePoint: (id: string) => void;
  selectCurvePoint: (id: string | undefined) => void;
  finishCurve: () => void;
  cancelCurve: () => void;
}

/**
 * Helper function to create a reset curve state.
 * Ensures consistent reset behavior across finishCurve and cancelCurve.
 */
const getResetCurveState = (): CurveState => ({
  mode: 'inactive',
  isActive: false,
  points: [],
  isClosingPath: false,
});

export const createCurvesPluginSlice: StateCreator<CurvesPluginSlice, [], [], CurvesPluginSlice> = (set) => ({
  // Initial state
  curves: {
    // No local settings needed - uses global grid configuration
  },

  curveState: getResetCurveState(),

  // Actions
  setCurveState: (state) => {
    set({ curveState: state });
  },

  addCurvePoint: (point) => {
    set((current) => ({
      curveState: {
        ...current.curveState,
        points: [
          ...current.curveState.points,
          {
            ...point,
            id: `curve-point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          },
        ],
      },
    }));
  },

  updateCurvePoint: (id, updates) => {
    set((current) => ({
      curveState: {
        ...current.curveState,
        points: current.curveState.points.map((point: CurvePoint) =>
          point.id === id ? { ...point, ...updates } : point
        ),
      },
    }));
  },

  deleteCurvePoint: (id) => {
    set((current) => ({
      curveState: {
        ...current.curveState,
        points: current.curveState.points.filter((point: CurvePoint) => point.id !== id),
        selectedPointId: current.curveState.selectedPointId === id ? undefined : current.curveState.selectedPointId,
      },
    }));
  },

  selectCurvePoint: (id) => {
    set((current) => ({
      curveState: {
        ...current.curveState,
        selectedPointId: id,
        points: current.curveState.points.map((point: CurvePoint) => ({
          ...point,
          selected: point.id === id,
        })),
      },
    }));
  },

  finishCurve: () => {
    // Convert points to SVG path and create element (not implemented)
    set(() => ({
      curveState: getResetCurveState(),
    }));
  },

  cancelCurve: () => {
    set(() => ({
      curveState: getResetCurveState(),
    }));
  },
});