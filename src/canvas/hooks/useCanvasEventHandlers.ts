import { useCallback } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useCanvasCurves } from '../../plugins/curves/useCanvasCurves';
import { getEffectiveShift } from '../../utils/effectiveShift';
import type { Point } from '../../types';
import { useCanvasEventBus } from '../CanvasEventBusContext';
import { pluginManager } from '../../utils/pluginManager';
import { calculateCommandsBounds, calculateMultiElementBounds } from '../../utils/selectionBoundsUtils';
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
  isCreatingShape: boolean;
  shapeStart: Point | null;
  transformStateIsTransforming: boolean;
  advancedTransformStateIsTransforming: boolean;
  updateTransformation: (point: Point, shiftPressed: boolean) => void;
  updateAdvancedTransformation: (point: Point) => void;
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
  startAdvancedTransformation: (handler: string, point: Point, isModifierPressed: boolean) => void;
  endAdvancedTransformation: () => void;
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
    advancedTransformStateIsTransforming,
    updateTransformation,
    updateAdvancedTransformation,
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
    startAdvancedTransformation,
    endAdvancedTransformation,
    completeSelectionRectangle,
    updateSelectionRectangle,
    updateShapeCreation,
    endShapeCreation,
    setMode,
  } = deps;

  const eventBus = useCanvasEventBus();

  // Double tap detection hook
  const { 
    handleElementTouchEnd: detectElementDoubleTap, 
    handleSubpathTouchEnd: detectSubpathDoubleTap,
    handleCanvasTouchEnd: detectCanvasDoubleTap 
  } = useDoubleTap();

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
              const pathData = element.data as import('../../types').PathData;
              if (subpathIndex < pathData.subPaths.length) {
                const subpath = pathData.subPaths[subpathIndex];

                // Calculate bounds using consolidated utility
                const bounds = calculateCommandsBounds(subpath, pathData.strokeWidth || 0, state.viewport.zoom);

                if (isFinite(bounds.minX) && state.snapToGrid) {
                  // Snap the top-left corner
                  const snappedTopLeft = state.snapToGrid(bounds.minX, bounds.minY);

                  // Calculate snap offset
                  const snapOffsetX = snappedTopLeft.x - bounds.minX;
                  const snapOffsetY = snappedTopLeft.y - bounds.minY;

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
          // Snap selected elements using consolidated utility
          const selectedElements = state.elements.filter(el => selectedIds.includes(el.id));
          const bounds = calculateMultiElementBounds(selectedElements, { 
            includeStroke: true, 
            zoom: state.viewport.zoom 
          });

          if (isFinite(bounds.minX) && state.snapToGrid) {
            // Snap the top-left corner
            const snappedTopLeft = state.snapToGrid(bounds.minX, bounds.minY);

            // Calculate snap offset
            const snapOffsetX = snappedTopLeft.x - bounds.minX;
            const snapOffsetY = snappedTopLeft.y - bounds.minY;

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

    const pathData = element.data as import('../../types').PathData;

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
  const handleSubpathDoubleClick = useCallback((elementId: string, subpathIndex: number, e: React.MouseEvent<Element>) => {
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
  }, [activePlugin]);

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
    
    if (isEmptySpace && (activePlugin === 'subpath' || activePlugin === 'transformation' || activePlugin === 'edit')) {
      e.preventDefault();
      e.stopPropagation();
      setMode('select');
    }
  }, [detectCanvasDoubleTap, activePlugin, setMode]);

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

  // Handle element pointer down for drag
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

      // Find the root group if this element is inside a group
      const element = state.elements.find(el => el.id === elementId);
      let targetId = elementId;
      if (element && element.parentId) {
        // Find the root group (group with no parent)
        let currentElement = element;
        while (currentElement.parentId) {
          const parent = state.elements.find(el => el.id === currentElement.parentId);
          if (!parent) break;
          currentElement = parent;
        }
        targetId = currentElement.id;
      }

      // Effective shift state (physical OR virtual)
      const effectiveShiftKey = getEffectiveShift(e.shiftKey, isVirtualShiftActive);

      // Only handle selection and dragging when shift is NOT pressed
      // When shift is pressed, let handleElementClick handle the toggle selection
      if (!effectiveShiftKey) {
        const selectedIds = state.selectedIds;
        const hasMultiSelection = selectedIds.length > 1;
        
        // Check if the clicked element or its root group is part of the current selection
        const isElementInSelection = selectedIds.includes(elementId) || selectedIds.includes(targetId);
        
        // If there's a multiselection and the element is part of it, preserve the selection
        // Otherwise, select only the target (root group or element)
        if (hasMultiSelection && isElementInSelection) {
          // Keep the current multiselection - don't change it
          // Just start dragging all selected elements
        } else if (!isElementInSelection) {
          // If element not selected, select it first (without multiselect)
          state.selectElement(targetId, false);
        }

        // Prepare for dragging (but don't start yet - wait for movement threshold in handlePointerMove)
        setDragStart(screenToCanvas(e.clientX, e.clientY));
        setHasDragMoved(false);
        // Note: isDragging and isDraggingElements will be set in handlePointerMove after threshold
      }
    }
  }, [activePlugin, screenToCanvas, setDragStart, setHasDragMoved, isVirtualShiftActive]);

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

    if (advancedTransformStateIsTransforming) {
      // Handle advanced transformations (distort, skew, perspective)
      // Mode is already determined in startAdvancedTransformation
      updateAdvancedTransformation(point);
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
    advancedTransformStateIsTransforming,
    updateAdvancedTransformation,
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

    if (isCreatingShape) {
      endShapeCreation();
    }

    if (transformStateIsTransforming) {
      endTransformation();
    }

    if (advancedTransformStateIsTransforming) {
      endAdvancedTransformation();
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
    advancedTransformStateIsTransforming,
    endAdvancedTransformation,
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
    // Skip handling on touch devices to avoid conflicts with custom double-tap detection
    if (typeof window !== 'undefined' && 'ontouchstart' in window) {
      return;
    }

    // Only handle double click if we're in specific modes and clicked on empty space
    const target = e.target as Element;
    const isEmptySpace = target.tagName === 'svg' || target.classList.contains('canvas-background');
    
    if (isEmptySpace && (activePlugin === 'subpath' || activePlugin === 'transformation' || activePlugin === 'edit')) {
      e.preventDefault();
      e.stopPropagation();
      setMode('select');
    }
  }, [activePlugin, setMode]);

  // Handle element double tap (combines element and subpath double tap logic)
  const handleElementDoubleTap = useCallback((elementId: string) => {

    // Create a synthetic mouse event
    const syntheticEvent = {
      preventDefault: () => {},
      stopPropagation: () => {},
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
    handleElementClick,
    handleElementDoubleClick,
    handleSubpathDoubleClick,
    handleElementDoubleTap,
    handleElementPointerDown,
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