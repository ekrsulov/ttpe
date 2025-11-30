import { useCallback } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { Point } from '../../types';
import { useCanvasDoubleClickHandlers } from './useCanvasDoubleClickHandlers';
import { useCanvasTouchHandlers } from './useCanvasTouchHandlers';
import { useCanvasPointerHandlers } from './useCanvasPointerHandlers';
import { isCanvasEmptySpace } from '../utils/domUtils';
import { useCanvasEventBus } from '../CanvasEventBusContext';
import { pluginManager } from '../../utils/pluginManager';

interface UseCanvasEventHandlersProps {
  screenToCanvas: (x: number, y: number) => Point;
  isSpacePressed: boolean;
  activePlugin: string | null;
  isSelecting: boolean;
  isDragging: boolean;
  dragStart: Point | null;
  hasDragMoved: boolean;
  beginSelectionRectangle: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragStart: (point: Point | null) => void;
  setHasDragMoved: (moved: boolean) => void;
  moveSelectedElements: (deltaX: number, deltaY: number, precisionOverride?: number) => void;
  moveSelectedSubpaths: (deltaX: number, deltaY: number) => void;
  isWorkingWithSubpaths: () => boolean;
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
  selectedIds: string[];
  completeSelectionRectangle: () => void;
  updateSelectionRectangle: (point: Point) => void;
}

/**
 * Main hook for canvas event handlers
 * Composes multiple focused hooks for double-click, touch, and pointer events
 */
export const useCanvasEventHandlers = (props: UseCanvasEventHandlersProps) => {
  const { activePlugin } = props;
  const eventBus = useCanvasEventBus();

  // Desktop double-click handlers
  const doubleClickHandlers = useCanvasDoubleClickHandlers({ activePlugin });

  // Mobile touch handlers (uses double-click handlers internally)
  const touchHandlers = useCanvasTouchHandlers({
    activePlugin,
    handleElementDoubleClick: doubleClickHandlers.handleElementDoubleClick,
    handleSubpathDoubleClick: doubleClickHandlers.handleSubpathDoubleClick,
  });

  // Pointer event handlers
  const pointerHandlers = useCanvasPointerHandlers({
    screenToCanvas: props.screenToCanvas,
    isSpacePressed: props.isSpacePressed,
    activePlugin,
    isSelecting: props.isSelecting,
    isDragging: props.isDragging,
    dragStart: props.dragStart,
    hasDragMoved: props.hasDragMoved,
    beginSelectionRectangle: props.beginSelectionRectangle,
    setIsDragging: props.setIsDragging,
    setDragStart: props.setDragStart,
    setHasDragMoved: props.setHasDragMoved,
    moveSelectedElements: props.moveSelectedElements,
    moveSelectedSubpaths: props.moveSelectedSubpaths,
    isWorkingWithSubpaths: props.isWorkingWithSubpaths,
    selectedSubpaths: props.selectedSubpaths,
    selectedIds: props.selectedIds,
    completeSelectionRectangle: props.completeSelectionRectangle,
    updateSelectionRectangle: props.updateSelectionRectangle,
  });

  // Handle double click on empty canvas to return to select mode
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    // Skip handling on touch devices to avoid conflicts with custom double-tap detection
    if (typeof window !== 'undefined' && 'ontouchstart' in window) {
      return;
    }

    // Only handle double click if we clicked on empty space
    if (isCanvasEmptySpace(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      eventBus.emit('canvasDoubleClick', {
        event: e,
        activePlugin
      });
    }
  }, [activePlugin, eventBus]);

  // Handle element double tap (combines element and subpath double tap logic)
  const handleElementDoubleTap = useCallback((elementId: string) => {
    // Create a synthetic mouse event
    const syntheticEvent = {
      preventDefault: () => { },
      stopPropagation: () => { },
      target: null,
      currentTarget: null,
      clientX: 0,
      clientY: 0,
      button: 0,
      type: 'dblclick',
    } as unknown as React.MouseEvent<Element>;

    // Check if we need to handle subpath double tap based on plugin's selection mode
    const state = useCanvasStore.getState();
    const hasSelectedSubpaths = state.selectedSubpaths && state.selectedSubpaths.length > 0;
    const selectionMode = pluginManager.getActiveSelectionMode();

    if (hasSelectedSubpaths && selectionMode === 'subpaths' && state.selectedSubpaths?.[0].elementId === elementId) {
      // Handle subpath double tap
      const subpathIndex = state.selectedSubpaths[0].subpathIndex;
      doubleClickHandlers.handleSubpathDoubleClick(elementId, subpathIndex, syntheticEvent);
    } else {
      // Handle regular element double tap
      doubleClickHandlers.handleElementDoubleClick(elementId, syntheticEvent);
    }
  }, [doubleClickHandlers]);

  return {
    // Desktop double-click handlers
    handleElementDoubleClick: doubleClickHandlers.handleElementDoubleClick,
    handleSubpathDoubleClick: doubleClickHandlers.handleSubpathDoubleClick,
    handleCanvasDoubleClick,

    // Pointer handlers
    handlePointerDown: pointerHandlers.handlePointerDown,
    handlePointerMove: pointerHandlers.handlePointerMove,
    handlePointerUp: pointerHandlers.handlePointerUp,

    // Touch handlers
    handleElementTouchEnd: touchHandlers.handleElementTouchEnd,
    handleSubpathTouchEnd: touchHandlers.handleSubpathTouchEnd,
    handleCanvasTouchEnd: touchHandlers.handleCanvasTouchEnd,

    // Combined double-tap handler
    handleElementDoubleTap,
  };
};
