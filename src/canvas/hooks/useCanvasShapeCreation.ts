import { useCallback, useState, useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { ShapeCreationController } from '../interactions/ShapeCreationController';
import type { Point } from '../../types';
import { pluginManager } from '../../utils/pluginManager';

export interface ShapeFeedback {
  width: number;
  height: number;
  visible: boolean;
  isShiftPressed: boolean;
  isMultipleOf10: boolean;
}

export interface PointPositionFeedback {
  x: number;
  y: number;
  visible: boolean;
}

export interface ShapeCreationState {
  isCreatingShape: boolean;
  shapeStart: Point | null;
  shapeEnd: Point | null;
  feedback: {
    shape: ShapeFeedback;
    pointPosition: PointPositionFeedback;
  };
}

export interface ShapeCreationActions {
  startShapeCreation: (startPoint: Point) => void;
  updateShapeCreation: (endPoint: Point, shiftPressed: boolean) => void;
  endShapeCreation: () => void;
  cancelShapeCreation: () => void;
  updatePointPositionFeedback: (x: number, y: number, visible: boolean) => void;
}

export type UseCanvasShapeCreationReturn = ShapeCreationState & ShapeCreationActions;

/**
 * Hook for managing shape creation state and feedback
 * Handles sticky shape creation with 10-pixel increments when Shift is pressed
 */
export const useCanvasShapeCreation = (): UseCanvasShapeCreationReturn => {
  const [isCreatingShape, setIsCreatingShape] = useState(false);
  const [shapeStart, setShapeStart] = useState<Point | null>(null);
  const [shapeEnd, setShapeEnd] = useState<Point | null>(null);

  const [shapeFeedback, setShapeFeedback] = useState<ShapeFeedback>({
    width: 0,
    height: 0,
    visible: false,
    isShiftPressed: false,
    isMultipleOf10: false,
  });

  const [pointPositionFeedback, setPointPositionFeedback] = useState<PointPositionFeedback>({
    x: 0,
    y: 0,
    visible: false,
  });

  const controller = useMemo(() => new ShapeCreationController({
    createShape: (start, end) => {
      // Use plugin API instead of store action
      pluginManager.callPluginApi('shape', 'createShape', start, end);
    },
    getSelectedShape: () => useCanvasStore.getState().shape?.selectedShape || 'square',
  }), []);

  const startShapeCreation = useCallback((startPoint: Point) => {
    // Snap to grid if enabled
    const storeState = useCanvasStore.getState();
    const snappedStartPoint = storeState.grid?.snapEnabled ? storeState.snapToGrid?.(startPoint.x, startPoint.y) || startPoint : startPoint;

    setIsCreatingShape(true);
    setShapeStart(snappedStartPoint);
    setShapeEnd(snappedStartPoint);

    // Initialize feedback
    setShapeFeedback({
      width: 0,
      height: 0,
      visible: true,
      isShiftPressed: false,
      isMultipleOf10: false,
    });
  }, []);

  const updateShapeCreation = useCallback((endPoint: Point, shiftPressed: boolean) => {
    if (!shapeStart) return;

    // Snap to grid if enabled
    const storeState = useCanvasStore.getState();
    const snappedEndPoint = storeState.grid?.snapEnabled ? storeState.snapToGrid?.(endPoint.x, endPoint.y) || endPoint : endPoint;

    setShapeEnd(snappedEndPoint);

    // Use controller to calculate feedback
    const feedback = controller.calculateShapeFeedback(shapeStart, snappedEndPoint, shiftPressed);
    setShapeFeedback(feedback);
  }, [shapeStart, controller]);

  const endShapeCreation = useCallback(() => {
    if (!shapeStart || !shapeEnd) return;

    // Use controller to complete shape creation
    controller.completeShapeCreation(shapeStart, shapeEnd);

    // Reset state
    setIsCreatingShape(false);
    setShapeStart(null);
    setShapeEnd(null);
    setShapeFeedback({
      width: 0,
      height: 0,
      visible: false,
      isShiftPressed: false,
      isMultipleOf10: false,
    });
  }, [shapeStart, shapeEnd, controller]);

  const cancelShapeCreation = useCallback(() => {
    setIsCreatingShape(false);
    setShapeStart(null);
    setShapeEnd(null);
    setShapeFeedback({
      width: 0,
      height: 0,
      visible: false,
      isShiftPressed: false,
      isMultipleOf10: false,
    });
  }, []);

  // Update point position feedback for edit mode
  const updatePointPositionFeedback = useCallback((x: number, y: number, visible: boolean) => {
    const feedback = controller.createPointPositionFeedback(x, y, visible);
    setPointPositionFeedback(feedback);
  }, [controller]);

  return {
    isCreatingShape,
    shapeStart,
    shapeEnd,
    feedback: {
      shape: shapeFeedback,
      pointPosition: pointPositionFeedback,
    },
    startShapeCreation,
    updateShapeCreation,
    endShapeCreation,
    cancelShapeCreation,
    // Additional utility for point position feedback
    updatePointPositionFeedback,
  };
};