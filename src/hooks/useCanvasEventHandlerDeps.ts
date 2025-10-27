import { useMemo, type RefObject } from 'react';
import type { Point } from '../types';

export interface CanvasEventHandlerDepsInput {
  svgRef: RefObject<SVGSVGElement | null>;
  screenToCanvas: (screenX: number, screenY: number) => Point;
  isSpacePressed: boolean;
  activePlugin: string | null;
  isSelecting: boolean;
  selectionStart: Point | null;
  isDragging: boolean;
  dragStart: Point | null;
  hasDragMoved: boolean;
  isCreatingShape: boolean;
  shapeStart: Point | null;
  transformStateIsTransforming: boolean;
  updateTransformation: (point: Point, isShiftPressed: boolean) => void;
  // Note: applyBrush and updateCursorPosition removed as they were not propagated
  beginSelectionRectangle: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void;
  startShapeCreation: (point: Point) => void;
  isSmoothBrushActive: boolean;
  setIsDragging: (value: boolean) => void;
  setDragStart: (point: Point | null) => void;
  setHasDragMoved: (value: boolean) => void;
  isWorkingWithSubpaths: () => boolean;
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
  selectedIds: string[];
  startTransformation: (elementId: string, handler: string, point: Point) => void;
  endTransformation: () => void;
  completeSelectionRectangle: () => void;
  updateSelectionRectangle: (point: Point) => void;
  updateShapeCreation: (point: Point, shiftPressed: boolean) => void;
  endShapeCreation: () => void;
  moveSelectedElements: (deltaX: number, deltaY: number) => void;
  moveSelectedSubpaths: (deltaX: number, deltaY: number) => void;
  selectElement: (elementId: string, toggle: boolean) => void;
  setMode: (mode: string) => void;
}

export interface CanvasEventHandlerDeps {
  svgRef: RefObject<SVGSVGElement | null>;
  screenToCanvas: (screenX: number, screenY: number) => Point;
  isSpacePressed: boolean;
  activePlugin: string | null;
  isSelecting: boolean;
  selectionStart: Point | null;
  isDragging: boolean;
  dragStart: Point | null;
  hasDragMoved: boolean;
  isCreatingShape: boolean;
  shapeStart: Point | null;
  transformStateIsTransforming: boolean;
  updateTransformation: (point: Point, isShiftPressed: boolean) => void;
  beginSelectionRectangle: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void;
  startShapeCreation: (point: Point) => void;
  isSmoothBrushActive: boolean;
  setIsDragging: (value: boolean) => void;
  setDragStart: (point: Point | null) => void;
  setHasDragMoved: (value: boolean) => void;
  isWorkingWithSubpaths: () => boolean;
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
  selectedIds: string[];
  startTransformation: (elementId: string, handler: string, point: Point) => void;
  endTransformation: () => void;
  completeSelectionRectangle: () => void;
  updateSelectionRectangle: (point: Point) => void;
  updateShapeCreation: (point: Point, shiftPressed: boolean) => void;
  endShapeCreation: () => void;
  moveSelectedElements: (deltaX: number, deltaY: number) => void;
  moveSelectedSubpaths: (deltaX: number, deltaY: number) => void;
  selectElement: (elementId: string, toggle: boolean) => void;
  setMode: (mode: string) => void;
}

/**
 * Hook that encapsulates the complex dependency list for canvas event handlers.
 * This isolates the memoization logic and makes the main component more readable.
 */
export function useCanvasEventHandlerDeps(
  input: CanvasEventHandlerDepsInput
): CanvasEventHandlerDeps {
  return useMemo(() => ({
    svgRef: input.svgRef,
    screenToCanvas: input.screenToCanvas,
    isSpacePressed: input.isSpacePressed,
    activePlugin: input.activePlugin,
    isSelecting: input.isSelecting,
    selectionStart: input.selectionStart,
    isDragging: input.isDragging,
    dragStart: input.dragStart,
    hasDragMoved: input.hasDragMoved,
    isCreatingShape: input.isCreatingShape,
    shapeStart: input.shapeStart,
    transformStateIsTransforming: input.transformStateIsTransforming,
    updateTransformation: input.updateTransformation,
    beginSelectionRectangle: input.beginSelectionRectangle,
    startShapeCreation: input.startShapeCreation,
    isSmoothBrushActive: input.isSmoothBrushActive,
    setIsDragging: input.setIsDragging,
    setDragStart: input.setDragStart,
    setHasDragMoved: input.setHasDragMoved,
    isWorkingWithSubpaths: input.isWorkingWithSubpaths,
    selectedSubpaths: input.selectedSubpaths,
    selectedIds: input.selectedIds,
    startTransformation: input.startTransformation,
    endTransformation: input.endTransformation,
    completeSelectionRectangle: input.completeSelectionRectangle,
    updateSelectionRectangle: input.updateSelectionRectangle,
    updateShapeCreation: input.updateShapeCreation,
    endShapeCreation: input.endShapeCreation,
    moveSelectedElements: input.moveSelectedElements,
    moveSelectedSubpaths: input.moveSelectedSubpaths,
    selectElement: input.selectElement,
    setMode: input.setMode,
  }), [
    input.svgRef,
    input.screenToCanvas,
    input.isSpacePressed,
    input.activePlugin,
    input.isSelecting,
    input.selectionStart,
    input.isDragging,
    input.dragStart,
    input.hasDragMoved,
    input.isCreatingShape,
    input.shapeStart,
    input.transformStateIsTransforming,
    input.updateTransformation,
    input.beginSelectionRectangle,
    input.startShapeCreation,
    input.isSmoothBrushActive,
    input.setIsDragging,
    input.setDragStart,
    input.setHasDragMoved,
    input.isWorkingWithSubpaths,
    input.selectedSubpaths,
    input.selectedIds,
    input.startTransformation,
    input.endTransformation,
    input.completeSelectionRectangle,
    input.updateSelectionRectangle,
    input.updateShapeCreation,
    input.endShapeCreation,
    input.moveSelectedElements,
    input.moveSelectedSubpaths,
    input.selectElement,
    input.setMode,
  ]);
}
