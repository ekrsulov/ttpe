import { useCallback, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { Point } from '../../types';
import { setGlobalCurvesController } from './globalController';
import { useCurvesController } from './useCurvesController';

export interface CurvesActions {
  activateCurves: () => void;
  deactivateCurves: () => void;
  handlePointerDown: (point: Point, shiftPressed?: boolean) => boolean;
  handlePointerMove: (point: Point) => boolean;
  handlePointerUp: () => boolean;
  finishPath: () => void;
  deleteSelectedPoint: () => void;
  setPointType: (pointId: string, type: 'corner' | 'smooth' | 'asymmetric') => void;
  selectCurvePoint: (id: string | undefined) => void;
  cancelCurve: () => void;
}

export type UseCanvasCurvesReturn = {
  isActive: boolean;
  curveState: ReturnType<typeof useCurvesController>['curveState'];
  controller: ReturnType<typeof useCurvesController>['controller'];
} & CurvesActions;

export const useCanvasCurves = (): UseCanvasCurvesReturn => {
  const { controller, curveState } = useCurvesController();

  // Register controller globally for shortcuts
  useEffect(() => {
    setGlobalCurvesController(controller);
    return () => {
      setGlobalCurvesController(null);
    };
  }, [controller]);

  const activateCurves = useCallback(() => {
    controller.activate();
  }, [controller]);

  const deactivateCurves = useCallback(() => {
    controller.deactivate();
  }, [controller]);

  const handlePointerDown = useCallback((point: Point, shiftPressed: boolean = false) => {
    return controller.handlePointerDown(point, shiftPressed);
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

  const selectCurvePoint = useCallback((id: string | undefined) => {
    controller.selectPoint(id);
    useCanvasStore.getState().selectCurvePoint?.(id);
  }, [controller]);

  const cancelCurve = useCallback(() => {
    controller.cancel();
  }, [controller]);

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
    selectCurvePoint,
    cancelCurve,
  };
};