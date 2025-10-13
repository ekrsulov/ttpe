import { useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { pluginManager } from '../utils/pluginManager';
import { useCanvasCurves } from './useCanvasCurves';
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

    // Effective shift state (physical OR virtual)
    const effectiveShiftKey = e.shiftKey || isVirtualShiftActive;

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
  }, [activePlugin, isDragging, dragStart, selectedIds, selectElement, setIsDragging, setDragStart, setHasDragMoved, hasDragMoved, isVirtualShiftActive]);

  // Handle element double click
  const handleElementDoubleClick = useCallback((elementId: string, e: React.MouseEvent<SVGPathElement>) => {
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
    const wasAlreadySelected = state.selectedSubpaths.length === 1 &&
      state.selectedSubpaths[0].elementId === elementId &&
      state.selectedSubpaths[0].subpathIndex === subpathIndex;

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
      e.stopPropagation(); // Prevent handlePointerDown from starting selection rectangle

      // Effective shift state (physical OR virtual)
      const effectiveShiftKey = e.shiftKey || isVirtualShiftActive;

      // Only handle selection and dragging when shift is NOT pressed
      // When shift is pressed, let handleElementClick handle the toggle selection
      if (!effectiveShiftKey) {
        const selectedIds = useCanvasStore.getState().selectedIds;
        const isElementSelected = selectedIds.includes(elementId);

        if (!isElementSelected) {
          // If element not selected, select it first (without multiselect)
          useCanvasStore.getState().selectElement(elementId, false);
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
    const target = e.target as Element;

    if (isSpacePressed || activePlugin === 'pan') {
      // Start panning
      return;
    }

    // Handle curves tool
    if (activePlugin === 'curves') {
      handleCurvesPointerDown(point);
      return;
    }

    if (activePlugin && pluginManager.hasTool(activePlugin)) {
      pluginManager.executeHandler(activePlugin, e, point, target, isSmoothBrushActive, beginSelectionRectangle, startShapeCreation);
    }
  }, [activePlugin, screenToCanvas, isSpacePressed, beginSelectionRectangle, startShapeCreation, isSmoothBrushActive, handleCurvesPointerDown]);

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

    // Handle pencil drawing
    if (activePlugin === 'pencil' && e.buttons === 1) {
      useCanvasStore.getState().addPointToPath(point);
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
                // Apply the delta to get the "would-be" position
                const projectedBounds = {
                  minX: minX + deltaX,
                  minY: minY + deltaY,
                  maxX: maxX + deltaX,
                  maxY: maxY + deltaY,
                };
                
                // Find alignment guidelines
                const alignmentMatches = state.findAlignmentGuidelines(firstElementId, projectedBounds);
                
                // Find distance guidelines if enabled (pass alignment matches for 2-element detection)
                const distanceMatches = state.guidelines.distanceEnabled 
                  ? state.findDistanceGuidelines(firstElementId, projectedBounds, alignmentMatches)
                  : [];
                
                // Update the guidelines state
                state.updateGuidelinesState({
                  currentMatches: alignmentMatches,
                  currentDistanceMatches: distanceMatches,
                });
                
                // Apply sticky snap
                const snappedDelta = state.checkStickySnap(deltaX, deltaY, projectedBounds);
                deltaX = snappedDelta.x;
                deltaY = snappedDelta.y;
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
      const effectiveShiftKey = e.shiftKey || isVirtualShiftActive;
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
      const effectiveShiftKey = e.shiftKey || isVirtualShiftActive;
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
  ]);

  // Handle pointer up
  const handlePointerUp = useCallback((_e: React.PointerEvent) => {
    // Handle curves tool
    if (activePlugin === 'curves') {
      handleCurvesPointerUp();
    }

    // Subpath dragging functionality removed - will be reimplemented

    // Only handle dragging if it hasn't been handled by element click already
    if (isDragging) {
      setIsDragging(false);
      
      // Clear guidelines when drag ends
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
    // Handle Escape key to clear selections or go back to select mode
    if (e.key === 'Escape') {
      e.preventDefault();
      
      const store = useCanvasStore.getState();
      
      // If file panel is open, close it and go to select mode
      if (store.showFilePanel) {
        store.setShowFilePanel(false);
        store.setActivePlugin('select');
        return;
      }
      
      // If settings panel is open, close it and go to select mode
      if (store.showSettingsPanel) {
        store.setShowSettingsPanel(false);
        store.setActivePlugin('select');
        return;
      }
      
      // If in select mode and there are element selections, clear them first
      if (activePlugin === 'select' && selectedIds.length > 0) {
        store.clearSelection();
        return;
      }
      
      // If in subpath mode and there are subpath selections, clear them first
      if (activePlugin === 'subpath' && selectedSubpaths.length > 0) {
        store.clearSubpathSelection();
        return;
      }
      
      // If in edit mode and there are selected commands, clear them first
      if (activePlugin === 'edit' && store.selectedCommands.length > 0) {
        store.clearSelectedCommands();
        return;
      }
      
      // If in transformation or edit mode and there are subpath selections, go to subpath mode
      if ((activePlugin === 'transformation' || activePlugin === 'edit') && selectedSubpaths.length > 0) {
        store.setActivePlugin('subpath');
        return;
      }
      
      // If no selections to clear, go back to select mode
      store.setActivePlugin('select');
      return;
    }

    if (activePlugin) {
      pluginManager.handleKeyboardEvent(activePlugin, e);
    }
  }, [activePlugin, selectedIds, selectedSubpaths]);

  // Handle wheel
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;
      useCanvasStore.getState().zoom(zoomFactor, centerX, centerY);
    }
  }, [svgRef]);

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
    handleKeyboard,
    handleCanvasDoubleClick,
  };
};