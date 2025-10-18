import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { CurvesController } from '../../canvasInteractions/CurvesController';
import type { Point, CurveState } from '../../types';

export interface CurvesActions {
  activateCurves: () => void;
  deactivateCurves: () => void;
  handlePointerDown: (point: Point) => boolean;
  handlePointerMove: (point: Point) => boolean;
  handlePointerUp: () => boolean;
  finishPath: () => void;
  deleteSelectedPoint: () => void;
  setPointType: (pointId: string, type: 'corner' | 'smooth' | 'asymmetric') => void;
}

export type UseCanvasCurvesReturn = {
  isActive: boolean;
  curveState: CurveState;
  controller: CurvesController;
} & CurvesActions;

export const useCanvasCurves = (): UseCanvasCurvesReturn => {
  const controller = useMemo(() => new CurvesController({
    pushToHistory: () => {
      // Using temporal middleware, changes are automatically tracked
    },
    addElement: (element) => useCanvasStore.getState().addElement(element),
    onCurveFinished: (elementId) => {
      // Switch to select mode and select the newly created element
      useCanvasStore.getState().setMode('select');
      useCanvasStore.getState().selectElement(elementId);
    },
  }), []);

  // Listen to controller state changes
  useEffect(() => {
    const unsubscribe = controller.addListener(() => {
      const newState = controller.getState();
      useCanvasStore.getState().setCurveState(newState);
    });
    return unsubscribe;
  }, [controller]);

  // Listen to canvas store changes to activate/deactivate curves
  const prevActiveRef = useRef<boolean>(false);

  useEffect(() => {
    const state = useCanvasStore.getState();
    const isActive = state.activePlugin === 'curves';
    const wasActive = prevActiveRef.current;

    if (isActive && !wasActive) {
      controller.activate();
    } else if (!isActive && wasActive) {
      controller.deactivate();
    }

    prevActiveRef.current = isActive;
  }); // No dependencies - this runs on every render but uses ref to prevent cycles

  const activateCurves = useCallback(() => {
    controller.activate();
  }, [controller]);

  const deactivateCurves = useCallback(() => {
    controller.deactivate();
  }, [controller]);

  const handlePointerDown = useCallback((point: Point) => {
    return controller.handlePointerDown(point);
  }, [controller]);

  const handlePointerMove = useCallback((point: Point) => {
    return controller.handlePointerMove(point);
  }, [controller]);

  const handlePointerUp = useCallback(() => {
    return controller.handlePointerUp();
  }, [controller]);

  const finishPath = useCallback(() => {
    controller.finishPath();
  }, [controller]);

  const deleteSelectedPoint = useCallback(() => {
    controller.deleteSelectedPoint();
  }, [controller]);

  const setPointType = useCallback((pointId: string, type: 'corner' | 'smooth' | 'asymmetric') => {
    controller.setPointType(pointId, type);
  }, [controller]);

  const curveState = useCanvasStore(state => state.curveState);

  return {
    isActive: curveState.isActive,
    curveState,
    controller,
    activateCurves,
    deactivateCurves,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    finishPath,
    deleteSelectedPoint,
    setPointType,
  };
};