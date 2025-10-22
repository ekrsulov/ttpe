import { useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useCanvasCurves } from '../plugins/curves/useCanvasCurves';
import { getEffectiveShift } from './useEffectiveShift';
import type { Point } from '../types';
import { useCanvasEventBus } from '../canvas/CanvasEventBusContext';
import { pluginManager } from '../utils/pluginManager';

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
  setMode: (mode: string) => void;
}

export const useCanvasEventHandlers = (deps: EventHandlerDeps) => {
  const { handlePointerDown: handleCurvesPointerDown, handlePointerMove: handleCurvesPointerMove, handlePointerUp: handleCurvesPointerUp } = useCanvasCurves();
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
    hasDragMoved,
    isCreatingShape,
    shapeStart,
    transformStateIsTransforming,
    updateTransformation,
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
    setMode,
  } = deps;

  const eventBus = useCanvasEventBus();

  // Apply snap to dragged elements or subpaths
  const applySnapToDraggedElements = useCallback(() => {
    // Apply snap to grid for selected elements or subpaths if snap is enabled
    if (((activePlugin === 'select' && selectedIds.length > 0 && !isWorkingWithSubpaths()) ||
         (activePlugin === 'subpath' && selectedSubpaths.length > 0 && isWorkingWithSubpaths()))) {
      const state = useCanvasStore.getState();
      if (state.grid?.snapEnabled && state.snapToGrid) {

        if (activePlugin === 'subpath' && selectedSubpaths.length > 0) {
          // Snap subpaths using their bounds
          selectedSubpaths.forEach(({ elementId, subpathIndex }) => {
            const element = state.elements.find(el => el.id === elementId);
            if (element && element.type === 'path') {
              const pathData = element.data as import('../types').PathData;
              if (subpathIndex < pathData.subPaths.length) {
                const subpath = pathData.subPaths[subpathIndex];

                // Calculate bounds for this subpath
                let minX = Infinity, minY = Infinity;
                subpath.forEach(cmd => {
                  if (cmd.type === 'M' || cmd.type === 'L') {
                    minX = Math.min(minX, cmd.position.x);
                    minY = Math.min(minY, cmd.position.y);
                  } else if (cmd.type === 'C') {
                    minX = Math.min(minX, cmd.position.x, cmd.controlPoint1.x, cmd.controlPoint2.x);
                    minY = Math.min(minY, cmd.position.y, cmd.controlPoint1.y, cmd.controlPoint2.y);
                  }
                });

                if (isFinite(minX) && state.snapToGrid) {
                  // Snap the top-left corner
                  const snappedTopLeft = state.snapToGrid(minX, minY);

                  // Calculate snap offset
                  const snapOffsetX = snappedTopLeft.x - minX;
                  const snapOffsetY = snappedTopLeft.y - minY;

                  // Apply snap offset to this subpath
                  if (snapOffsetX !== 0 || snapOffsetY !== 0) {
                    // Use moveSelectedSubpaths to apply the snap
                    // But we need to modify it to work with individual subpaths
                    // For now, let's use the existing moveSelectedSubpaths but filter to only this subpath
                    const originalSelectedSubpaths = state.selectedSubpaths;
                    // Temporarily set selectedSubpaths to only this one
                    useCanvasStore.setState({ selectedSubpaths: [{ elementId, subpathIndex }] });
                    moveSelectedSubpaths(snapOffsetX, snapOffsetY);
                    // Restore original selection
                    useCanvasStore.setState({ selectedSubpaths: originalSelectedSubpaths });
                  }
                }
              }
            }
          });
        } else if (activePlugin === 'select' && selectedIds.length > 0) {
          // Snap selected elements (existing logic)
          // Calculate the bounding box of all selected elements
          let overallMinX = Infinity;
          let overallMinY = Infinity;

          selectedIds.forEach(elementId => {
            const element = state.elements.find(el => el.id === elementId);
            if (element && element.type === 'path') {
              const pathData = element.data as import('../types').PathData;

              // Calculate bounds for this element
              let minX = Infinity, minY = Infinity;
              pathData.subPaths.forEach(subPath => {
                subPath.forEach(cmd => {
                  if (cmd.type === 'M' || cmd.type === 'L') {
                    minX = Math.min(minX, cmd.position.x);
                    minY = Math.min(minY, cmd.position.y);
                  } else if (cmd.type === 'C') {
                    minX = Math.min(minX, cmd.position.x, cmd.controlPoint1.x, cmd.controlPoint2.x);
                    minY = Math.min(minY, cmd.position.y, cmd.controlPoint1.y, cmd.controlPoint2.y);
                  }
                });
              });

              if (isFinite(minX)) {
                overallMinX = Math.min(overallMinX, minX);
                overallMinY = Math.min(overallMinY, minY);
              }
            }
          });

          if (isFinite(overallMinX)) {
            // Snap the top-left corner
            const snappedTopLeft = state.snapToGrid(overallMinX, overallMinY);

            // Calculate snap offset
            const snapOffsetX = snappedTopLeft.x - overallMinX;
            const snapOffsetY = snappedTopLeft.y - overallMinY;

            // Apply snap offset to selected elements
            if (snapOffsetX !== 0 || snapOffsetY !== 0) {
              moveSelectedElements(snapOffsetX, snapOffsetY);
            }
          }
        }
      }
    }
  }, [activePlugin, selectedIds, selectedSubpaths, isWorkingWithSubpaths, moveSelectedElements, moveSelectedSubpaths]);

  // Handle element click
  const handleElementClick = useCallback((elementId: string, e: React.PointerEvent) => {
    e.stopPropagation();

    // If we were dragging and moved, apply snap and end the drag
    if (isDragging && hasDragMoved) {
      applySnapToDraggedElements();
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

    const state = useCanvasStore.getState();
    if (state.isElementHidden && state.isElementHidden(elementId)) {
      return;
    }

    if (state.isElementLocked && state.isElementLocked(elementId)) {
      return;
    }

    // Effective shift state (physical OR virtual)
    const effectiveShiftKey = getEffectiveShift(e.shiftKey, isVirtualShiftActive);

    // Only process click if we're in select mode and either not dragging, or dragging but haven't moved
    if (activePlugin === 'select' && (!isDragging || !hasDragMoved)) {
      const isElementSelected = selectedIds.includes(elementId);
      const hasMultipleSelection = selectedIds.length > 1;

      // If clicking on an already selected element within a multi-selection and no shift, keep the multi-selection
      if (isElementSelected && hasMultipleSelection && !effectiveShiftKey) {
        // Don't change selection - this was already handled in pointerDown
        return;
      }

      // Handle selection logic
      if (effectiveShiftKey) {
        // Shift+click: toggle selection (add/remove from selection)
        selectElement(elementId, true);
      } else if (!isElementSelected) {
        // Normal click on unselected element: select it (clear others)
        selectElement(elementId, false);
      }
      // If element is already selected and no shift, keep it selected (no action needed)
    }
  }, [activePlugin, isDragging, dragStart, selectedIds, selectElement, setIsDragging, setDragStart, setHasDragMoved, hasDragMoved, isVirtualShiftActive, applySnapToDraggedElements]);

  // Handle element double click
  const handleElementDoubleClick = useCallback((elementId: string, e: React.MouseEvent<Element>) => {
    e.stopPropagation();
    e.preventDefault();

    const state = useCanvasStore.getState();
    const element = state.elements.find(el => el.id === elementId);

    if (!element || element.type !== 'path') return;

    const pathData = element.data as import('../types').PathData;

    // Check if this element was already the only selected element
    const wasAlreadySelected = state.selectedIds.length === 1 && state.selectedIds[0] === elementId;

    // Ensure the element is selected
    if (!state.selectedIds.includes(elementId)) {
      state.selectElement(elementId, false);
    }

    if (activePlugin === 'select') {
      // Only proceed if this element is selected and it's the only one selected
      if (state.selectedIds.length === 1 && state.selectedIds[0] === elementId) {
        if (pathData.subPaths.length === 1) {
          // Single subpath -> go to transformation mode
          state.setActivePlugin('transformation');
        } else if (pathData.subPaths.length > 1) {
          // Multiple subpaths -> go to subpath mode
          state.setActivePlugin('subpath');
        }
      }
    } else if (activePlugin === 'transformation') {
      if (wasAlreadySelected) {
        // Same element -> go to edit mode (existing cycle)
        state.setActivePlugin('edit');
      }
      // If different element, selection changed but stay in transformation mode
    } else if (activePlugin === 'edit') {
      if (!wasAlreadySelected) {
        // Different element -> selection changed, stay in edit mode
      }
      // If same element, do nothing
    }
  }, [activePlugin]);

  // Handle subpath double click
  const handleSubpathDoubleClick = useCallback((elementId: string, subpathIndex: number, e: React.MouseEvent<SVGPathElement>) => {
    e.stopPropagation();
    e.preventDefault();

    const state = useCanvasStore.getState();

    // Check if this subpath was already selected
    const wasAlreadySelected = (state.selectedSubpaths?.length ?? 0) === 1 &&
      state.selectedSubpaths?.[0].elementId === elementId &&
      state.selectedSubpaths?.[0].subpathIndex === subpathIndex;

    if (activePlugin === 'subpath') {
      if (wasAlreadySelected) {
        // Same subpath -> go to transformation mode
        state.setActivePlugin('transformation');
      }
      // If different subpath, selection already changed but stay in subpath mode
    } else if (activePlugin === 'transformation') {
      if (wasAlreadySelected) {
        // Same subpath -> go to edit mode (existing cycle)
        state.setActivePlugin('edit');
      } else {
        // Different subpath -> select this specific subpath and stay in transformation mode
        const subpathSelection = [{ elementId, subpathIndex }];
        useCanvasStore.setState({ selectedSubpaths: subpathSelection });
      }
    } else if (activePlugin === 'edit') {
      if (!wasAlreadySelected) {
        // Different subpath -> select this specific subpath and stay in edit mode
        const subpathSelection = [{ elementId, subpathIndex }];
        useCanvasStore.setState({ selectedSubpaths: subpathSelection });
      }
      // If same subpath, do nothing
    }
  }, [activePlugin]);  // Handle element pointer down for drag
  const handleElementPointerDown = useCallback((elementId: string, e: React.PointerEvent) => {
    if (activePlugin === 'select') {
      const state = useCanvasStore.getState();
      
      // Check if element is locked - if so, treat it as empty space
      if (state.isElementLocked && state.isElementLocked(elementId)) {
        // Don't stop propagation - let it behave as empty space
        return;
      }

      e.stopPropagation(); // Prevent handlePointerDown from starting selection rectangle
      
      // Check if style eyedropper is active
      if (state.styleEyedropper.isActive) {
        // Apply style to the clicked path
        state.applyStyleToPath(elementId);
        return;
      }

      // Effective shift state (physical OR virtual)
      const effectiveShiftKey = getEffectiveShift(e.shiftKey, isVirtualShiftActive);

      // Only handle selection and dragging when shift is NOT pressed
      // When shift is pressed, let handleElementClick handle the toggle selection
      if (!effectiveShiftKey) {
        const selectedIds = state.selectedIds;
        const isElementSelected = selectedIds.includes(elementId);

        if (!isElementSelected) {
          // If element not selected, select it first (without multiselect)
          state.selectElement(elementId, false);
        }

        // Start dragging
        setIsDragging(true);
        setDragStart(screenToCanvas(e.clientX, e.clientY));
        setHasDragMoved(false);
      }
    }
  }, [activePlugin, screenToCanvas, setIsDragging, setDragStart, setHasDragMoved, isVirtualShiftActive]);

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
    const target = (e.target as Element) ?? null;

    if (isSpacePressed || activePlugin === 'pan') {
      return;
    }

    if (activePlugin === 'file' || activePlugin === 'settings') {
      setMode('select');
      return;
    }

    if (activePlugin === 'curves') {
      const effectiveShift = getEffectiveShift(e.shiftKey, isVirtualShiftActive);
      handleCurvesPointerDown(point, effectiveShift);
    }

    // Plugin handlers are now executed via the eventBus in pluginManager
    // to avoid duplicate execution

    eventBus.emit('pointerdown', {
      event: e,
      point,
      target,
      activePlugin,
      helpers: {
        beginSelectionRectangle,
        updateSelectionRectangle,
        completeSelectionRectangle,
        startShapeCreation,
        updateShapeCreation,
        endShapeCreation,
        isSmoothBrushActive,
      },
      state: {
        isSelecting,
        isCreatingShape,
        isDragging,
        dragStart,
      },
    });
  }, [
    activePlugin,
    screenToCanvas,
    isSpacePressed,
    setMode,
    handleCurvesPointerDown,
    eventBus,
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
    startShapeCreation,
    updateShapeCreation,
    endShapeCreation,
    isSmoothBrushActive,
    isSelecting,
    isCreatingShape,
    isDragging,
    dragStart,
    isVirtualShiftActive,
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
        startShapeCreation,
        updateShapeCreation,
        endShapeCreation,
        isSmoothBrushActive,
      },
      state: {
        isSelecting,
        isCreatingShape,
        isDragging,
        dragStart,
      },
    });

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

    // Handle pencil drawing
    if (activePlugin === 'pencil' && e.buttons === 1) {
      // Use plugin API instead of store action
      pluginManager.callPluginApi('pencil', 'addPointToPath', point);
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
          let deltaX = point.x - dragStart.x;
          let deltaY = point.y - dragStart.y;
          
          // Calculate guidelines for selected elements
          const state = useCanvasStore.getState();
          if (state.guidelines && state.guidelines.enabled && selectedIds.length > 0) {
            // Calculate bounds for the first selected element (for simplicity, we use the first one for snapping)
            const firstElementId = selectedIds[0];
            const element = state.elements.find(el => el.id === firstElementId);
            
            if (element && element.type === 'path') {
              const pathData = element.data as import('../types').PathData;
              
              // Calculate current bounds
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              pathData.subPaths.forEach(subPath => {
                subPath.forEach(cmd => {
                  if (cmd.type === 'M' || cmd.type === 'L') {
                    minX = Math.min(minX, cmd.position.x);
                    minY = Math.min(minY, cmd.position.y);
                    maxX = Math.max(maxX, cmd.position.x);
                    maxY = Math.max(maxY, cmd.position.y);
                  } else if (cmd.type === 'C') {
                    minX = Math.min(minX, cmd.position.x, cmd.controlPoint1.x, cmd.controlPoint2.x);
                    minY = Math.min(minY, cmd.position.y, cmd.controlPoint1.y, cmd.controlPoint2.y);
                    maxX = Math.max(maxX, cmd.position.x, cmd.controlPoint1.x, cmd.controlPoint2.x);
                    maxY = Math.max(maxY, cmd.position.y, cmd.controlPoint1.y, cmd.controlPoint2.y);
                  }
                });
              });
              
              if (isFinite(minX)) {
                const halfStroke = (pathData.strokeWidth ?? 0) / 2;

                // Apply the delta to get the "would-be" position including stroke width
                const projectedBounds = {
                  minX: minX + deltaX - halfStroke,
                  minY: minY + deltaY - halfStroke,
                  maxX: maxX + deltaX + halfStroke,
                  maxY: maxY + deltaY + halfStroke,
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
          
          moveSelectedElements(deltaX, deltaY);
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

    // Handle curves tool
    if (activePlugin === 'curves') {
      handleCurvesPointerMove(point);
      return;
    }

    // Pencil tool is handled by native DOM listeners in Canvas.tsx
    // Skip React event handling for pencil to avoid conflicts
    if (activePlugin === 'pencil') {
      return;
    }

    // Smooth brush is handled by native DOM listeners in Canvas.tsx
    // Skip React event handling for smooth brush to avoid conflicts
    if (activePlugin === 'edit' && isSmoothBrushActive) {
      return;
    }

    if (isSelecting && selectionStart) {
      updateSelectionRectangle(point);
    }

    if (isCreatingShape && shapeStart) {
      // Effective shift state (physical OR virtual)
      const effectiveShiftKey = getEffectiveShift(e.shiftKey, isVirtualShiftActive);
      updateShapeCreation(point, effectiveShiftKey);
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
    handleCurvesPointerMove,
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
    selectionStart,
    shapeStart,
    updateShapeCreation,
    updateSelectionRectangle,
    isVirtualShiftActive,
    selectedIds,
    beginSelectionRectangle,
    completeSelectionRectangle,
    endShapeCreation,
    startShapeCreation,
    eventBus,
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
        startShapeCreation,
        updateShapeCreation,
        endShapeCreation,
        isSmoothBrushActive,
      },
      state: {
        isSelecting,
        isCreatingShape,
        isDragging,
        dragStart,
      },
    });

    // Handle curves tool
    if (activePlugin === 'curves') {
      handleCurvesPointerUp();
    }

    // Subpath dragging functionality removed - will be reimplemented

    // Only handle dragging if it hasn't been handled by element click already
    if (isDragging) {
      applySnapToDraggedElements();
      setIsDragging(false);      // Clear guidelines when drag ends
      const state = useCanvasStore.getState();
      if (state.clearGuidelines) {
        state.clearGuidelines();
      }
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
    activePlugin,
    handleCurvesPointerUp,
    isDragging,
    applySnapToDraggedElements,
    setIsDragging,
    setDragStart,
    setHasDragMoved,
    isSelecting,
    completeSelectionRectangle,
    isCreatingShape,
    endShapeCreation,
    transformStateIsTransforming,
    endTransformation,
    screenToCanvas,
    updateSelectionRectangle,
    updateShapeCreation,
    eventBus,
    dragStart,
    isSmoothBrushActive,
    beginSelectionRectangle,
    startShapeCreation,
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
    // Only handle double click if we're in specific modes and clicked on empty space
    const target = e.target as Element;
    const isEmptySpace = target.tagName === 'svg' || target.classList.contains('canvas-background');
    
    if (isEmptySpace && (activePlugin === 'subpath' || activePlugin === 'transformation' || activePlugin === 'edit')) {
      e.preventDefault();
      e.stopPropagation();
      setMode('select');
    }
  }, [activePlugin, setMode]);

  return {
    handleElementClick,
    handleElementDoubleClick,
    handleSubpathDoubleClick,
    handleElementPointerDown,
    handleTransformationHandlerPointerDown,
    handleTransformationHandlerPointerUp,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    handleCanvasDoubleClick,
  };
};