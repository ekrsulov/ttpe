import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { Point } from '../../types';

type BeginSelectionRectangle = (
  point: Point,
  shouldClearCommands?: boolean,
  shouldClearSubpaths?: boolean
) => void;

type UpdateSelectionRectangle = (point: Point) => void;

type CompleteSelectionRectangle = () => void;

type StartShapeCreation = (startPoint: Point) => void;

type UpdateShapeCreation = (endPoint: Point, shiftPressed: boolean) => void;

type EndShapeCreation = () => void;

export interface PointerHelpersSnapshot {
  beginSelectionRectangle: BeginSelectionRectangle;
  updateSelectionRectangle: UpdateSelectionRectangle;
  completeSelectionRectangle: CompleteSelectionRectangle;
  startShapeCreation: StartShapeCreation;
  updateShapeCreation: UpdateShapeCreation;
  endShapeCreation: EndShapeCreation;
  isSmoothBrushActive: boolean;
}

export interface PointerStateSnapshot {
  isSelecting: boolean;
  isCreatingShape: boolean;
  isDragging: boolean;
  dragStart: Point | null;
}

export interface PointerStateRefs {
  pointer: MutableRefObject<PointerStateSnapshot>;
}

interface UsePointerStateControllerParams {
  isSelecting: boolean;
  isCreatingShape: boolean;
  beginSelectionRectangle: BeginSelectionRectangle;
  updateSelectionRectangle: UpdateSelectionRectangle;
  completeSelectionRectangle: CompleteSelectionRectangle;
  startShapeCreation: StartShapeCreation;
  updateShapeCreation: UpdateShapeCreation;
  endShapeCreation: EndShapeCreation;
  isSmoothBrushActive: boolean;
}

export const usePointerStateController = ({
  isSelecting,
  isCreatingShape,
  beginSelectionRectangle,
  updateSelectionRectangle,
  completeSelectionRectangle,
  startShapeCreation,
  updateShapeCreation,
  endShapeCreation,
  isSmoothBrushActive,
}: UsePointerStateControllerParams) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [hasDragMoved, setHasDragMoved] = useState(false);

  const pointerStateRef = useRef<PointerStateSnapshot>({
    isSelecting,
    isCreatingShape,
    isDragging,
    dragStart,
  });

  const helpersRef = useRef<PointerHelpersSnapshot>({
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
    startShapeCreation,
    updateShapeCreation,
    endShapeCreation,
    isSmoothBrushActive,
  });

  useEffect(() => {
    pointerStateRef.current = {
      isSelecting,
      isCreatingShape,
      isDragging,
      dragStart,
    };
  }, [isSelecting, isCreatingShape, isDragging, dragStart]);

  useEffect(() => {
    helpersRef.current = {
      beginSelectionRectangle,
      updateSelectionRectangle,
      completeSelectionRectangle,
      startShapeCreation,
      updateShapeCreation,
      endShapeCreation,
      isSmoothBrushActive,
    };
  }, [
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
    startShapeCreation,
    updateShapeCreation,
    endShapeCreation,
    isSmoothBrushActive,
  ]);

  const stateRefs = useMemo<PointerStateRefs>(() => ({ pointer: pointerStateRef }), []);

  return {
    isDragging,
    dragStart,
    hasDragMoved,
    setIsDragging,
    setDragStart,
    setHasDragMoved,
    stateRefs,
    helpers: helpersRef,
  };
};
