import { useCallback, useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { toolRegistry } from '../utils/toolRegistry';
import { PluginManager } from '../utils/pluginManager';
import type { Point } from '../types';

interface EventHandlerDeps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  screenToCanvas: (x: number, y: number) => Point;
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
  updateTransformation: (point: Point, shiftPressed: boolean) => void;
  applyBrush: (point: Point) => void;
  updateCursorPosition: (point: Point) => void;
  beginSelectionRectangle: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void;
  startShapeCreation: (point: Point) => void;
  isSmoothBrushActive: boolean;
  setIsDragging: (dragging: boolean) => void;
  setDragStart: (point: Point | null) => void;
  setHasDragMoved: (moved: boolean) => void;
  moveSelectedElements: (deltaX: number, deltaY: number) => void;
  moveSelectedSubpaths: (deltaX: number, deltaY: number) => void;
  isWorkingWithSubpaths: () => boolean;
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
  selectedIds: string[];
  selectElement: (elementId: string, toggle: boolean) => void;
  startTransformation: (elementId: string, handler: string, point: Point) => void;
  endTransformation: () => void;
  completeSelectionRectangle: () => void;
  updateSelectionRectangle: (point: Point) => void;
  updateShapeCreation: (point: Point, shiftPressed: boolean) => void;
  endShapeCreation: () => void;
}

export const useCanvasEventHandlers = (deps: EventHandlerDeps) => {
  const pluginManager = useMemo(() => new PluginManager(toolRegistry), []);
  const {
    svgRef,
    screenToCanvas,
    isSpacePressed,
    activePlugin,
    isSelecting,
    selectionStart,
    isDragging,
    dragStart,
    hasDragMoved,
    isCreatingShape,
    shapeStart,
    transformStateIsTransforming,
    updateTransformation,
    applyBrush,
    updateCursorPosition,
    beginSelectionRectangle,
    startShapeCreation,
    isSmoothBrushActive,
    setIsDragging,
    setDragStart,
    setHasDragMoved,
    moveSelectedElements,
    moveSelectedSubpaths,
    isWorkingWithSubpaths,
    selectedSubpaths,
    selectedIds,
    selectElement,
    startTransformation,
    endTransformation,
    completeSelectionRectangle,
    updateSelectionRectangle,
    updateShapeCreation,
    endShapeCreation,
  } = deps;

  // Handle element click
  const handleElementClick = useCallback((elementId: string, e: React.PointerEvent) => {
    e.stopPropagation();

    // If we were dragging and moved, just end the drag - don't process as a click
    if (isDragging && hasDragMoved) {
      setIsDragging(false);
      setDragStart(null);
      setHasDragMoved(false);
      return;
    }

    // If we have dragStart but no movement, it was just a click - clean up
    if (dragStart && !hasDragMoved) {
      setDragStart(null);
      setIsDragging(false);
    }

    // Only process click if we're in select mode and either not dragging, or dragging but haven't moved
    if (activePlugin === 'select' && (!isDragging || !hasDragMoved)) {
      const isElementSelected = selectedIds.includes(elementId);
      const hasMultipleSelection = selectedIds.length > 1;

      // If clicking on an already selected element within a multi-selection and no shift, keep the multi-selection
      if (isElementSelected && hasMultipleSelection && !e.shiftKey) {
        // Don't change selection - this was already handled in pointerDown
        return;
      }

      // Handle selection logic
      if (e.shiftKey) {
        // Shift+click: toggle selection (add/remove from selection)
        selectElement(elementId, true);
      } else if (!isElementSelected) {
        // Normal click on unselected element: select it (clear others)
        selectElement(elementId, false);
      }
      // If element is already selected and no shift, keep it selected (no action needed)
    }
  }, [activePlugin, isDragging, dragStart, selectedIds, selectElement, setIsDragging, setDragStart, setHasDragMoved, hasDragMoved]);

  // Handle element pointer down for drag
  const handleElementPointerDown = useCallback((elementId: string, e: React.PointerEvent) => {
    if (activePlugin === 'select') {
      e.stopPropagation(); // Prevent handlePointerDown from starting selection rectangle

      const selectedIds = useCanvasStore.getState().selectedIds;
      const isElementSelected = selectedIds.includes(elementId);

      if (!isElementSelected) {
        // If element not selected, select it first
        useCanvasStore.getState().selectElement(elementId, false);
      }

      // Start dragging
      setIsDragging(true);
      setDragStart(screenToCanvas(e.clientX, e.clientY));
      setHasDragMoved(false);
    }
  }, [activePlugin, screenToCanvas, setIsDragging, setDragStart, setHasDragMoved]);

  // Handle transformation handler pointer down
  const handleTransformationHandlerPointerDown = useCallback((e: React.PointerEvent, elementId: string, handler: string) => {
    e.stopPropagation();
    const point = screenToCanvas(e.clientX, e.clientY);
    startTransformation(elementId, handler, point);
  }, [screenToCanvas, startTransformation]);

  // Handle transformation handler pointer up
  const handleTransformationHandlerPointerUp = useCallback((_e: React.PointerEvent) => {
    endTransformation();
  }, [endTransformation]);

  // Handle pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const point = screenToCanvas(e.clientX, e.clientY);
    const target = e.target as Element;

    if (isSpacePressed || activePlugin === 'pan') {
      // Start panning
      return;
    }

    if (activePlugin && pluginManager.hasTool(activePlugin)) {
      pluginManager.executeHandler(activePlugin, e, point, target, isSmoothBrushActive, beginSelectionRectangle, startShapeCreation);
    }
  }, [activePlugin, screenToCanvas, isSpacePressed, beginSelectionRectangle, startShapeCreation, isSmoothBrushActive, pluginManager]);

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const point = screenToCanvas(e.clientX, e.clientY);

    if (isSpacePressed && e.buttons === 1) {
      // Pan the canvas with spacebar + pointer button
      const deltaX = e.movementX;
      const deltaY = e.movementY;
      useCanvasStore.getState().pan(deltaX, deltaY);
      return;
    }

    if (activePlugin === 'pan' && e.buttons === 1) {
      // Pan the canvas with pan tool + pointer button
      const deltaX = e.movementX;
      const deltaY = e.movementY;
      useCanvasStore.getState().pan(deltaX, deltaY);
      return;
    }

    // Check for potential element dragging (when we have dragStart but may not be isDragging yet)
    if (dragStart && !transformStateIsTransforming && !isSelecting && !isCreatingShape) {
      const deltaX = point.x - dragStart.x;
      const deltaY = point.y - dragStart.y;

      // Only start actual dragging if we've moved more than a threshold
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        if (!isDragging) {
          setIsDragging(true); // Start dragging now
        }
        setHasDragMoved(true);

        // Check if we're working with subpaths
        if (isWorkingWithSubpaths()) {
          // Move selected subpaths if we have a drag start
          if (dragStart && selectedSubpaths.length > 0) {
            const deltaX = point.x - dragStart.x;
            const deltaY = point.y - dragStart.y;
            moveSelectedSubpaths(deltaX, deltaY);
            setDragStart(point);
          }
          return;
        } else {
          // Move entire selected elements
          const deltaX = point.x - dragStart.x;
          const deltaY = point.y - dragStart.y;
          moveSelectedElements(deltaX, deltaY);
          setDragStart(point);
        }
      }
      return;
    }

    if (transformStateIsTransforming) {
      updateTransformation(point, e.shiftKey);
      return;
    }

    if (activePlugin === 'pencil' && e.buttons === 1) {
      useCanvasStore.getState().addPointToPath(point);
    }

    // Handle smooth brush in edit mode
    if (activePlugin === 'edit' && isSmoothBrushActive && e.buttons === 1) {
      applyBrush(point);
    }

    // Update smooth brush cursor position
    if (activePlugin === 'edit' && isSmoothBrushActive) {
      updateCursorPosition(point);
    }

    if (isSelecting && selectionStart) {
      updateSelectionRectangle(point);
    }

    if (isCreatingShape && shapeStart) {
      updateShapeCreation(point, e.shiftKey);
    }

    // Handle subpath dragging
    if (isWorkingWithSubpaths() && dragStart && selectedSubpaths.length > 0) {
      const canvasStart = screenToCanvas(dragStart.x, dragStart.y);
      const canvasCurrent = screenToCanvas(point.x, point.y);
      const deltaX = canvasCurrent.x - canvasStart.x;
      const deltaY = canvasCurrent.y - canvasStart.y;
      moveSelectedSubpaths(deltaX, deltaY);
      setDragStart(point);
      return;
    }
  }, [
    activePlugin,
    screenToCanvas,
    isSpacePressed,
    dragStart,
    transformStateIsTransforming,
    isSelecting,
    isCreatingShape,
    isDragging,
    setIsDragging,
    setHasDragMoved,
    isWorkingWithSubpaths,
    selectedSubpaths,
    moveSelectedSubpaths,
    moveSelectedElements,
    setDragStart,
    updateTransformation,
    isSmoothBrushActive,
    applyBrush,
    updateCursorPosition,
    selectionStart,
    shapeStart,
    updateShapeCreation,
    updateSelectionRectangle,
  ]);

  // Handle pointer up
  const handlePointerUp = useCallback((_e: React.PointerEvent) => {
    // Subpath dragging functionality removed - will be reimplemented

    // Only handle dragging if it hasn't been handled by element click already
    if (isDragging) {
      setIsDragging(false);
    }
    setDragStart(null);
    setHasDragMoved(false);

    if (isSelecting) {
      completeSelectionRectangle();
    }

    if (isCreatingShape) {
      endShapeCreation();
    }

    if (transformStateIsTransforming) {
      endTransformation();
    }
  }, [
    isDragging,
    setIsDragging,
    setDragStart,
    setHasDragMoved,
    isSelecting,
    completeSelectionRectangle,
    isCreatingShape,
    endShapeCreation,
    transformStateIsTransforming,
    endTransformation,
  ]);

  // Handle keyboard events for tools
  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    if (activePlugin) {
      pluginManager.handleKeyboardEvent(activePlugin, e);
    }
  }, [activePlugin, pluginManager]);

  // Handle wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;
      useCanvasStore.getState().zoom(zoomFactor, centerX, centerY);
    }
  }, [svgRef]);

  return {
    handleElementClick,
    handleElementPointerDown,
    handleTransformationHandlerPointerDown,
    handleTransformationHandlerPointerUp,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    handleKeyboard,
  };
};