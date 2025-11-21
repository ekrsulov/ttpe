import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { Point } from '../../types';

type BeginSelectionRectangle = (
  point: Point,
  shouldClearCommands?: boolean,
  shouldClearSubpaths?: boolean
) => void;

type UpdateSelectionRectangle = (point: Point) => void;

type CompleteSelectionRectangle = () => void;

export interface PointerHelpersSnapshot {
  beginSelectionRectangle: BeginSelectionRectangle;
  updateSelectionRectangle: UpdateSelectionRectangle;
  completeSelectionRectangle: CompleteSelectionRectangle;
}

export interface PointerStateSnapshot {
  isSelecting: boolean;
  isDragging: boolean;
  dragStart: Point | null;
  hasDragMoved: boolean;
}

export interface PointerStateRefs {
  pointer: MutableRefObject<PointerStateSnapshot>;
}

interface UsePointerStateControllerParams {
  isSelecting: boolean;
  beginSelectionRectangle: BeginSelectionRectangle;
  updateSelectionRectangle: UpdateSelectionRectangle;
  completeSelectionRectangle: CompleteSelectionRectangle;
}

export const usePointerStateController = ({
  isSelecting,
  beginSelectionRectangle,
  updateSelectionRectangle,
  completeSelectionRectangle,
}: UsePointerStateControllerParams) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [hasDragMoved, setHasDragMoved] = useState(false);

  const pointerStateRef = useRef<PointerStateSnapshot>({
    isSelecting,
    isDragging,
    dragStart,
    hasDragMoved,
  });

  const helpersRef = useRef<PointerHelpersSnapshot>({
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
  });

  useEffect(() => {
    pointerStateRef.current = {
      isSelecting,
      isDragging,
      dragStart,
      hasDragMoved,
    };
  }, [isSelecting, isDragging, dragStart, hasDragMoved]);

  useEffect(() => {
    helpersRef.current = {
      beginSelectionRectangle,
      updateSelectionRectangle,
      completeSelectionRectangle,
    };
  }, [
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
  ]);

  const stateRefs = useMemo(
    () => ({
      pointer: pointerStateRef,
    }),
    []
  );

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
