import { useMemo, type RefObject } from 'react';
import type { Point } from '../../types';

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
  // Note: applyBrush and updateCursorPosition removed as they were not propagated
  beginSelectionRectangle: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void;
  setIsDragging: (value: boolean) => void;
  setDragStart: (point: Point | null) => void;
  setHasDragMoved: (value: boolean) => void;
  isWorkingWithSubpaths: () => boolean;
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
  selectedIds: string[];
  completeSelectionRectangle: () => void;
  updateSelectionRectangle: (point: Point) => void;
  moveSelectedElements: (deltaX: number, deltaY: number, precisionOverride?: number) => void;
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
  beginSelectionRectangle: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void;
  setIsDragging: (value: boolean) => void;
  setDragStart: (point: Point | null) => void;
  setHasDragMoved: (value: boolean) => void;
  isWorkingWithSubpaths: () => boolean;
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
  selectedIds: string[];
  completeSelectionRectangle: () => void;
  updateSelectionRectangle: (point: Point) => void;
  moveSelectedElements: (deltaX: number, deltaY: number, precisionOverride?: number) => void;
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
    beginSelectionRectangle: input.beginSelectionRectangle,
    setIsDragging: input.setIsDragging,
    setDragStart: input.setDragStart,
    setHasDragMoved: input.setHasDragMoved,
    isWorkingWithSubpaths: input.isWorkingWithSubpaths,
    selectedSubpaths: input.selectedSubpaths,
    selectedIds: input.selectedIds,
    completeSelectionRectangle: input.completeSelectionRectangle,
    updateSelectionRectangle: input.updateSelectionRectangle,
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
    input.beginSelectionRectangle,
    input.setIsDragging,
    input.setDragStart,
    input.setHasDragMoved,
    input.isWorkingWithSubpaths,
    input.selectedSubpaths,
    input.selectedIds,
    input.completeSelectionRectangle,
    input.updateSelectionRectangle,
    input.moveSelectedElements,
    input.moveSelectedSubpaths,
    input.selectElement,
    input.setMode,
  ]);
}
