import { useCallback, useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { Point } from '../types';

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

  const startShapeCreation = useCallback((startPoint: Point) => {
    setIsCreatingShape(true);
    setShapeStart(startPoint);
    setShapeEnd(startPoint);

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

    setShapeEnd(endPoint);

    // Calculate dimensions
    const rawWidth = Math.abs(endPoint.x - shapeStart.x);
    const rawHeight = Math.abs(endPoint.y - shapeStart.y);

    // Apply sticky creation (10-pixel increments) when Shift is pressed
    let adjustedWidth = rawWidth;
    let adjustedHeight = rawHeight;

    if (shiftPressed) {
      // Round to nearest 10-pixel increment
      adjustedWidth = Math.round(rawWidth / 10) * 10;
      adjustedHeight = Math.round(rawHeight / 10) * 10;
    }

    // Check if adjusted dimensions are multiples of 10
    const isMultipleOf10 = (Math.abs(adjustedWidth) % 10 === 0) && (Math.abs(adjustedHeight) % 10 === 0);

    // Calculate real dimensions based on shape type
    const selectedShape = useCanvasStore.getState().shape.selectedShape;
    let realWidth = adjustedWidth;
    let realHeight = adjustedHeight;

    if (selectedShape === 'square') {
      // Square always has equal sides
      const sideLength = Math.min(adjustedWidth, adjustedHeight);
      realWidth = sideLength;
      realHeight = sideLength;
    } else if (selectedShape === 'circle') {
      // Circle always has equal width and height (diameter)
      const diameter = Math.min(adjustedWidth, adjustedHeight);
      realWidth = diameter;
      realHeight = diameter;
    }
    // For rectangle, realWidth and realHeight are already correct

    setShapeFeedback({
      width: Math.round(realWidth),
      height: Math.round(realHeight),
      visible: true,
      isShiftPressed: shiftPressed,
      isMultipleOf10,
    });
  }, [shapeStart]);

  const endShapeCreation = useCallback(() => {
    if (!shapeStart || !shapeEnd) return;

    // Create the shape
    useCanvasStore.getState().createShape(shapeStart, shapeEnd);

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
  }, [shapeStart, shapeEnd]);

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
    setPointPositionFeedback({
      x: Math.round(x),
      y: Math.round(y),
      visible,
    });
  }, []);

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