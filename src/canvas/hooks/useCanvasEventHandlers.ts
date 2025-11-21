import { useCallback } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { getEffectiveShift } from '../../utils/effectiveShift';
import type { Point } from '../../types';
import { useCanvasEventBus } from '../CanvasEventBusContext';
import { calculateCommandsBounds } from '../../utils/selectionBoundsUtils';
import { useDoubleTap } from './useDoubleTap';

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
  transformStateIsTransforming: boolean;
  advancedTransformStateIsTransforming: boolean;
  updateTransformation: (point: Point, shiftPressed: boolean) => void;
  updateAdvancedTransformation: (point: Point) => void;
  beginSelectionRectangle: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragStart: (point: Point | null) => void;
  setHasDragMoved: (moved: boolean) => void;
  moveSelectedElements: (deltaX: number, deltaY: number, precisionOverride?: number) => void;
  moveSelectedSubpaths: (deltaX: number, deltaY: number) => void;
  isWorkingWithSubpaths: () => boolean;
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
  selectedIds: string[];
  selectElement: (elementId: string, toggle: boolean) => void;
  startTransformation: (elementId: string, handler: string, point: Point) => void;
  endTransformation: () => void;
  startAdvancedTransformation: (handler: string, point: Point, isModifierPressed: boolean) => void;
  endAdvancedTransformation: () => void;
  completeSelectionRectangle: () => void;
  updateSelectionRectangle: (point: Point) => void;
  setMode: (mode: string) => void;
}

export const useCanvasEventHandlers = (deps: EventHandlerDeps) => {
  const isVirtualShiftActive = useCanvasStore(state => state.isVirtualShiftActive);

  const {
    svgRef,
    screenToCanvas,
    isSpacePressed,
    activePlugin,
    isSelecting,
    selectionStart,
    isDragging,
    dragStart,
    transformStateIsTransforming,
    advancedTransformStateIsTransforming,
    updateTransformation,
    updateAdvancedTransformation,
    beginSelectionRectangle,
    setIsDragging,
    setDragStart,
    setHasDragMoved,
    moveSelectedElements,
    moveSelectedSubpaths,
    isWorkingWithSubpaths,
    selectedSubpaths,
    selectedIds,
    startTransformation,
    endTransformation,
    startAdvancedTransformation,
    endAdvancedTransformation,
    completeSelectionRectangle,
    updateSelectionRectangle,
  } = deps;

  const eventBus = useCanvasEventBus();

  // Double tap detection hook
  const {
    handleElementTouchEnd: detectElementDoubleTap,
    handleSubpathTouchEnd: detectSubpathDoubleTap,
    handleCanvasTouchEnd: detectCanvasDoubleTap
  } = useDoubleTap();

  // Handle element double click
  const handleElementDoubleClick = useCallback((elementId: string, e: React.MouseEvent<Element>) => {
    e.stopPropagation();
    e.preventDefault();

    eventBus.emit('elementDoubleClick', {
      elementId,
      event: e,
      activePlugin
    });
  }, [activePlugin, eventBus]);

  // Handle subpath double click
  const handleSubpathDoubleClick = useCallback((elementId: string, subpathIndex: number, e: React.MouseEvent<Element>) => {
    e.stopPropagation();
    e.preventDefault();

    eventBus.emit('subpathDoubleClick', {
      elementId,
      subpathIndex,
      event: e,
      activePlugin
    });
  }, [activePlugin, eventBus]);

  // Handle element touch end for double tap detection
  const handleElementTouchEnd = useCallback((elementId: string, e: React.TouchEvent<Element>) => {
    // Detect if this is a double tap
    const isDoubleTap = detectElementDoubleTap(elementId, e);

    if (!isDoubleTap) {
      // Single tap - do nothing special
      return;
    }

    // Double tap detected - prevent default and create synthetic mouse event
    e.preventDefault();
    e.stopPropagation();

    const touch = e.changedTouches[0];
    if (!touch) return;

    const syntheticEvent = {
      preventDefault: () => e.preventDefault(),
      stopPropagation: () => e.stopPropagation(),
      target: e.target,
      currentTarget: e.currentTarget,
      clientX: touch.clientX,
      clientY: touch.clientY,
      button: 0,
      type: 'dblclick',
    } as React.MouseEvent<Element>;

    // Call the double click handler
    handleElementDoubleClick(elementId, syntheticEvent);
  }, [detectElementDoubleTap, handleElementDoubleClick]);

  // Handle canvas touch end for double tap on empty space
  const handleCanvasTouchEnd = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    // Detect if this is a double tap on empty space
    const isDoubleTap = detectCanvasDoubleTap(e);

    if (!isDoubleTap) {
      // Single tap - do nothing special
      return;
    }

    // Double tap detected on empty space
    const target = e.target as Element;
    const isEmptySpace = target.tagName === 'svg' || target.classList.contains('canvas-background');

    if (isEmptySpace) {
      e.preventDefault();
      e.stopPropagation();

      const touch = e.changedTouches[0];
      if (!touch) return;

      const syntheticEvent = {
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        target: e.target,
        currentTarget: e.currentTarget,
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        type: 'dblclick',
      } as unknown as React.MouseEvent<Element>;

      eventBus.emit('canvasDoubleClick', {
        event: syntheticEvent,
        activePlugin
      });
    }
  }, [detectCanvasDoubleTap, activePlugin, eventBus]);

  // Handle subpath touch end for double tap detection
  const handleSubpathTouchEnd = useCallback((elementId: string, subpathIndex: number, e: React.TouchEvent<SVGPathElement>) => {
    // Detect if this is a double tap on a subpath
    const isDoubleTap = detectSubpathDoubleTap(elementId, subpathIndex, e);

    if (!isDoubleTap) {
      // Single tap - do nothing special
      return;
    }

    // Double tap detected - prevent default and create synthetic mouse event
    e.preventDefault();
    e.stopPropagation();

    const touch = e.changedTouches[0];
    if (!touch) return;

    const syntheticEvent = {
      preventDefault: () => e.preventDefault(),
      stopPropagation: () => e.stopPropagation(),
      target: e.target,
      currentTarget: e.currentTarget,
      clientX: touch.clientX,
      clientY: touch.clientY,
      button: 0,
      type: 'dblclick',
    } as React.MouseEvent<SVGPathElement>;

    // Call the subpath double click handler
    handleSubpathDoubleClick(elementId, subpathIndex, syntheticEvent);
  }, [detectSubpathDoubleTap, handleSubpathDoubleClick]);

  // Handle transformation handler pointer down
  const handleTransformationHandlerPointerDown = useCallback((e: React.PointerEvent, elementId: string, handler: string) => {
    e.stopPropagation();
    const point = screenToCanvas(e.clientX, e.clientY);

    // Check if this is an advanced transformation handler
    if (handler.startsWith('advanced-')) {
      const isModifierPressed = e.metaKey || e.ctrlKey || e.altKey;
      startAdvancedTransformation(handler, point, isModifierPressed);
      return;
    }

    startTransformation(elementId, handler, point);
  }, [screenToCanvas, startTransformation, startAdvancedTransformation]);

  // Handle transformation handler pointer up
  const handleTransformationHandlerPointerUp = useCallback((_e: React.PointerEvent) => {
    endTransformation();
    endAdvancedTransformation();
  }, [endTransformation, endAdvancedTransformation]);

  // Handle pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const point = screenToCanvas(e.clientX, e.clientY);
    const target = (e.target as Element) ?? null;

    if (isSpacePressed || activePlugin === 'pan') {
      return;
    }

    eventBus.emit('pointerdown', {
      event: e,
      point,
      target,
      activePlugin,
      helpers: {
        beginSelectionRectangle,
        updateSelectionRectangle,
        completeSelectionRectangle,
        setIsDragging,
        setDragStart,
        setHasDragMoved,
      },
      state: {
        isSelecting,
        isDragging,
        dragStart,
        hasDragMoved: deps.hasDragMoved,
      },
    });
  }, [
    activePlugin,
    screenToCanvas,
    isSpacePressed,
    eventBus,
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
    isSelecting,
    isDragging,
    dragStart,
    deps.hasDragMoved,
    setIsDragging,
    setDragStart,
    setHasDragMoved,
  ]);

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const point = screenToCanvas(e.clientX, e.clientY);
    const target = (e.target as Element) ?? null;

    eventBus.emit('pointermove', {
      event: e,
      point,
      target,
      activePlugin,
      helpers: {
        beginSelectionRectangle,
        updateSelectionRectangle,
        completeSelectionRectangle,
        setIsDragging,
        setDragStart,
        setHasDragMoved,
      },
      state: {
        isSelecting,
        isDragging,
        dragStart,
        hasDragMoved: deps.hasDragMoved,
      },
    });

    if (isSpacePressed && e.buttons === 1) {
      // Pan the canvas with spacebar + pointer button
      const deltaX = e.movementX;
      const deltaY = e.movementY;
      useCanvasStore.getState().pan(deltaX, deltaY);
      return;
    }

    // Check for potential element dragging (when we have dragStart but may not be isDragging yet)
    // Use fresh state for dragStart to avoid race conditions
    const currentDragStart = dragStart;

    if (currentDragStart && !transformStateIsTransforming && !isSelecting) {
      const deltaX = point.x - currentDragStart.x;
      const deltaY = point.y - currentDragStart.y;

      // Only start actual dragging if we've moved more than a threshold
      // Once dragging has started, move with any delta (no threshold) for smooth continuous movement
      const shouldStartDragging = !isDragging && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3);
      const shouldContinueDragging = isDragging && (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001);

      if (shouldStartDragging || shouldContinueDragging) {
        if (!isDragging) {
          setIsDragging(true); // Start dragging now
          // Set global flag to prevent re-renders in action bars and select panel
          useCanvasStore.getState().setIsDraggingElements(true);
        }
        setHasDragMoved(true);

        // Check if we're working with subpaths
        if (isWorkingWithSubpaths() && activePlugin !== 'select') {
          // Move selected subpaths if we have a drag start
          if (currentDragStart && selectedSubpaths.length > 0) {
            const deltaX = point.x - currentDragStart.x;
            const deltaY = point.y - currentDragStart.y;
            moveSelectedSubpaths(deltaX, deltaY);
            setDragStart(point);
          }
          return;
        } else {
          // Move entire selected elements
          let deltaX = point.x - currentDragStart.x;
          let deltaY = point.y - currentDragStart.y;

          // Calculate guidelines for selected elements
          const state = useCanvasStore.getState();
          if (state.guidelines && state.guidelines.enabled && selectedIds.length > 0) {
            // Calculate bounds for the first selected element (for simplicity, we use the first one for snapping)
            const firstElementId = selectedIds[0];
            const element = state.elements.find(el => el.id === firstElementId);

            if (element && element.type === 'path') {
              const pathData = element.data as import('../../types').PathData;

              // Calculate current bounds using consolidated utility
              const commands = pathData.subPaths.flat();
              const bounds = calculateCommandsBounds(commands, pathData.strokeWidth || 0, state.viewport.zoom);

              if (isFinite(bounds.minX)) {
                // Apply the delta to get the "would-be" position
                const projectedBounds = {
                  minX: bounds.minX + deltaX,
                  minY: bounds.minY + deltaY,
                  maxX: bounds.maxX + deltaX,
                  maxY: bounds.maxY + deltaY,
                };

                // Find alignment guidelines
                const alignmentMatches = state.findAlignmentGuidelines?.(firstElementId, projectedBounds) ?? [];

                // Find distance guidelines if enabled (pass alignment matches for 2-element detection)
                const distanceMatches = (state.guidelines?.distanceEnabled && state.findDistanceGuidelines)
                  ? state.findDistanceGuidelines(firstElementId, projectedBounds, alignmentMatches)
                  : [];

                // Update the guidelines state
                if (state.updateGuidelinesState) {
                  state.updateGuidelinesState({
                    currentMatches: alignmentMatches,
                    currentDistanceMatches: distanceMatches,
                  });
                }

                // Apply sticky snap
                if (state.checkStickySnap) {
                  const snappedDelta = state.checkStickySnap(deltaX, deltaY, projectedBounds);
                  deltaX = snappedDelta.x;
                  deltaY = snappedDelta.y;
                }
              }
            }
          }

          moveSelectedElements(deltaX, deltaY, 3);
          setDragStart(point);
        }
      }
      return;
    }

    if (transformStateIsTransforming) {
      // Effective shift state (physical OR virtual)
      const effectiveShiftKey = getEffectiveShift(e.shiftKey, isVirtualShiftActive);
      updateTransformation(point, effectiveShiftKey);
      return;
    }

    if (advancedTransformStateIsTransforming) {
      // Handle advanced transformations (distort, skew, perspective)
      // Mode is already determined in startAdvancedTransformation
      updateAdvancedTransformation(point);
      return;
    }

    if (isSelecting && selectionStart) {
      updateSelectionRectangle(point);
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
    isDragging,
    setIsDragging,
    setHasDragMoved,
    isWorkingWithSubpaths,
    selectedSubpaths,
    moveSelectedSubpaths,
    moveSelectedElements,
    setDragStart,
    updateTransformation,
    selectionStart,
    updateSelectionRectangle,
    isVirtualShiftActive,
    selectedIds,
    beginSelectionRectangle,
    completeSelectionRectangle,
    eventBus,
    advancedTransformStateIsTransforming,
    updateAdvancedTransformation,
    deps.hasDragMoved,
  ]);

  // Handle pointer up
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const point = screenToCanvas(e.clientX, e.clientY);
    const target = (e.target as Element) ?? null;

    eventBus.emit('pointerup', {
      event: e,
      point,
      target,
      activePlugin,
      helpers: {
        beginSelectionRectangle,
        updateSelectionRectangle,
        completeSelectionRectangle,
        setIsDragging,
        setDragStart,
        setHasDragMoved,
      },
      state: {
        isSelecting,
        isDragging,
        dragStart,
        hasDragMoved: deps.hasDragMoved,
      },
    });

    // Only handle dragging if it hasn't been handled by element click already
    if (isDragging) {
      setIsDragging(false);
      // Clear guidelines when drag ends
      const state = useCanvasStore.getState();
      if (state.clearGuidelines) {
        state.clearGuidelines();
      }
    }

    // Always clear global flag on pointer up (even if local isDragging is false)
    // This ensures the flag doesn't get stuck when clicking to add shapes, etc.
    useCanvasStore.getState().setIsDraggingElements(false);

    setDragStart(null);
    setHasDragMoved(false);

    if (isSelecting) {
      completeSelectionRectangle();
    }

    if (transformStateIsTransforming) {
      endTransformation();
    }

    if (advancedTransformStateIsTransforming) {
      endAdvancedTransformation();
    }
  }, [
    activePlugin,
    isDragging,
    setIsDragging,
    setDragStart,
    setHasDragMoved,
    isSelecting,
    completeSelectionRectangle,
    transformStateIsTransforming,
    endTransformation,
    advancedTransformStateIsTransforming,
    endAdvancedTransformation,
    screenToCanvas,
    updateSelectionRectangle,
    eventBus,
    dragStart,
    beginSelectionRectangle,
    deps.hasDragMoved,
  ]);

  // Handle wheel
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    eventBus.emit('wheel', {
      event: e,
      activePlugin,
      svg: svgRef.current,
    });
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;
      useCanvasStore.getState().zoom(zoomFactor, centerX, centerY);
    }
  }, [svgRef, eventBus, activePlugin]);

  // Handle double click on empty canvas to return to select mode
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    // Skip handling on touch devices to avoid conflicts with custom double-tap detection
    if (typeof window !== 'undefined' && 'ontouchstart' in window) {
      return;
    }

    // Only handle double click if we're in specific modes and clicked on empty space
    const target = e.target as Element;
    const isEmptySpace = target.tagName === 'svg' || target.classList.contains('canvas-background');

    if (isEmptySpace) {
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

    // Check if we need to handle subpath double tap
    const state = useCanvasStore.getState();
    const hasSelectedSubpaths = state.selectedSubpaths && state.selectedSubpaths.length > 0;
    const isSubpathMode = state.activePlugin === 'subpath';

    if (hasSelectedSubpaths && isSubpathMode && state.selectedSubpaths?.[0].elementId === elementId) {
      // Handle subpath double tap
      const subpathIndex = state.selectedSubpaths[0].subpathIndex;
      handleSubpathDoubleClick(elementId, subpathIndex, syntheticEvent);
    } else {
      // Handle regular element double tap
      handleElementDoubleClick(elementId, syntheticEvent);
    }
  }, [handleElementDoubleClick, handleSubpathDoubleClick]);

  return {
    handleElementDoubleClick,
    handleSubpathDoubleClick,
    handleElementDoubleTap,
    handleTransformationHandlerPointerDown,
    handleTransformationHandlerPointerUp,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    handleCanvasDoubleClick,
    handleElementTouchEnd,
    handleSubpathTouchEnd,
    handleCanvasTouchEnd,
  };
};
