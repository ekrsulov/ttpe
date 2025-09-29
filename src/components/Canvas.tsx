import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { measurePath, measureSubpathBounds } from '../utils/measurementUtils';
import { extractEditablePoints } from '../utils/pathParserUtils';
import { mapPointerToCanvas } from '../utils/coordinateUtils';
import { CanvasRenderer } from './CanvasRenderer';
import { OpticalAlignmentOverlay, FeedbackOverlay } from './overlays';
import { TransformationOverlay } from './overlays/TransformationOverlay';
import { useCanvasKeyboardControls } from '../hooks/useCanvasKeyboardControls';
import { useCanvasPointerSelection } from '../hooks/useCanvasPointerSelection';
import { useCanvasTransformControls } from '../hooks/useCanvasTransformControls';
import { useCanvasShapeCreation } from '../hooks/useCanvasShapeCreation';
import { useCanvasOpticalAlignment } from '../hooks/useCanvasOpticalAlignment';
import type { Point, PathData, CanvasElement } from '../types';

export const Canvas: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { isSpacePressed, isShiftPressed } = useCanvasKeyboardControls();
  const {
    isSelecting,
    selectionStart,
    selectionEnd,
    justSelected,
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle
  } = useCanvasPointerSelection(isShiftPressed);
  const {
    transformState,
    feedback,
    startTransformation,
    updateTransformation,
    endTransformation
  } = useCanvasTransformControls();
  const {
    isCreatingShape,
    shapeStart,
    shapeEnd,
    feedback: shapeFeedback,
    startShapeCreation,
    updateShapeCreation,
    endShapeCreation,
    // cancelShapeCreation, // TODO: Implement when needed
    updatePointPositionFeedback
  } = useCanvasShapeCreation();
  const {
    currentAlignment,
    showMathematicalCenter,
    showOpticalCenter,
    showDistanceRules,
    // calculateAlignment, // TODO: Expose via toolbar/menu when needed
    // applyAlignment, // TODO: Expose via toolbar/menu when needed
    // previewAlignment, // TODO: Expose via toolbar/menu when needed
    // resetAlignment, // TODO: Expose via toolbar/menu when needed
    // toggleMathematicalCenter, // TODO: Expose via settings when needed
    // toggleOpticalCenter, // TODO: Expose via settings when needed
    // toggleDistanceRules, // TODO: Expose via settings when needed
    // canPerformOpticalAlignment, // TODO: Use for validation when needed
    // getAlignmentValidationMessage // TODO: Use for error messages when needed
  } = useCanvasOpticalAlignment();
  const {
    elements,
    viewport,
    activePlugin,
    transformation,
    shape,
    selectedIds,
    editingPoint,
    selectedCommands,
    selectedSubpaths,
    draggingSelection,
    updateElement,
    startDraggingPoint,
    updateDraggingPoint,
    stopDraggingPoint,
    emergencyCleanupDrag,
    selectCommand,
    clearSelectedCommands,
    selectSubpath,
    clearSubpathSelection,
    clearSelection,
    getTransformationBounds,
    isWorkingWithSubpaths,
    getFilteredEditablePoints,
    smoothBrush,
    applySmoothBrush,
    updateSmoothBrushCursor,
    getControlPointInfo
    // Optical Alignment State - now handled by useCanvasOpticalAlignment hook
    // currentAlignment,
    // showMathematicalCenter,
    // showOpticalCenter,
    // showDistanceRules
  } = useCanvasStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [hasDragMoved, setHasDragMoved] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update point position feedback when selection changes
  useEffect(() => {
    if (activePlugin === 'edit' && selectedCommands.length === 1) {
      const selectedCommand = selectedCommands[0];
      const element = elements.find(el => el.id === selectedCommand.elementId);
      
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const commands = pathData.subPaths.flat();
        const points = extractEditablePoints(commands);
        
        // Find the specific point
        const point = points.find(p => 
          p.commandIndex === selectedCommand.commandIndex && 
          p.pointIndex === selectedCommand.pointIndex
        );
        
        if (point) {
          updatePointPositionFeedback(point.x, point.y, true);
          return;
        }
      }
    }
    
    // Hide feedback if conditions not met
    updatePointPositionFeedback(0, 0, false);
  }, [activePlugin, selectedCommands, elements, updatePointPositionFeedback]);

  // Emergency cleanup listeners for drag states
  useEffect(() => {
    const handleEmergencyCleanup = () => {
      if (editingPoint?.isDragging || draggingSelection?.isDragging) {
        emergencyCleanupDrag();
      }
    };

    // Multiple emergency cleanup triggers
    window.addEventListener('beforeunload', handleEmergencyCleanup);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        handleEmergencyCleanup();
      }
    });

    // Cleanup on component unmount
    return () => {
      handleEmergencyCleanup();
      window.removeEventListener('beforeunload', handleEmergencyCleanup);
    };
  }, [editingPoint?.isDragging, draggingSelection?.isDragging, emergencyCleanupDrag]);

  // Transform screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    return mapPointerToCanvas(svgRef.current, viewport, screenX, screenY);
  }, [viewport]);

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
      const selectedIds = useCanvasStore.getState().selectedIds;
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
        useCanvasStore.getState().selectElement(elementId, true);
      } else if (!isElementSelected) {
        // Normal click on unselected element: select it (clear others)
        useCanvasStore.getState().selectElement(elementId, false);
      }
      // If element is already selected and no shift, keep it selected (no action needed)

      // Mark that we just made a selection to prevent immediate clearing
      // Note: justSelected is now managed by useCanvasPointerSelection hook
    }
  }, [activePlugin, isDragging, hasDragMoved, dragStart]);

  // Handle element pointer down for drag
  const handleElementPointerDown = useCallback((elementId: string, e: React.PointerEvent) => {
    if (activePlugin === 'select') {
      e.stopPropagation(); // Prevent handlePointerDown from starting selection rectangle

      const selectedIds = useCanvasStore.getState().selectedIds;
      const isElementSelected = selectedIds.includes(elementId);

      // If element is not selected and shift is not pressed, select it for dragging
      // (if shift is pressed, let handleElementClick handle the selection)
      if (!isElementSelected && !e.shiftKey) {
        useCanvasStore.getState().selectElement(elementId, false);
      }

      const point = screenToCanvas(e.clientX, e.clientY);
      // Don't set isDragging=true yet - only prepare for potential drag
      setHasDragMoved(false); // Reset drag movement flag
      setDragStart(point); // Store start point for potential drag
    }
  }, [activePlugin, screenToCanvas]);

  // Helper function to get element bounds considering current transform
  const getElementBounds = (element: typeof elements[0]) => {
    if (element.type === 'path') {
      const pathData = element.data as import('../types').PathData;
      return measurePath(pathData.subPaths, pathData.strokeWidth, viewport.zoom);
    }
    return null;
  };

  // Get bounds for a specific subpath
  const getSubpathBounds = (element: CanvasElement, subpathIndex: number) => {
    if (element.type !== 'path') return null;

    try {
      const pathData = element.data as PathData;

      if (subpathIndex >= pathData.subPaths.length) return null;

      const subpath = pathData.subPaths[subpathIndex];
      return measureSubpathBounds(subpath, pathData.strokeWidth || 1, viewport.zoom);
    } catch (error) {
      console.warn('Failed to calculate individual subpath bounds:', error);
      return null;
    }
  };

  // Handle transformation handler pointer down
   
  const handleTransformationHandlerPointerDown = useCallback((e: React.PointerEvent, elementId: string, handler: string) => {
    e.stopPropagation();

    // Capture the pointer to ensure we receive pointerup events even if the pointer moves outside the handler
    if (e.currentTarget && 'setPointerCapture' in e.currentTarget) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    const point = screenToCanvas(e.clientX, e.clientY);
    startTransformation(elementId, handler, point);
  }, [screenToCanvas, startTransformation]);
   

  const handleTransformationHandlerPointerUp = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();

    // Release pointer capture if it was set
    if (e.currentTarget && 'releasePointerCapture' in e.currentTarget) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_error) {
        // Ignore errors if pointer capture was not set or already released
      }
    }

    endTransformation();
  }, [endTransformation]);

  // Handle pointer events
  /* eslint-disable react-hooks/exhaustive-deps */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const point = screenToCanvas(e.clientX, e.clientY);
    const target = e.target as Element;

    if (isSpacePressed || activePlugin === 'pan') {
      // Start panning
      return;
    }

    switch (activePlugin) {
      case 'pencil':
        useCanvasStore.getState().startPath(point);
        break;
      case 'text': {
        const state = useCanvasStore.getState();
        state.addText(point.x, point.y, state.text.text);
        break;
      }
      case 'shape':
        // Start creating a shape
        startShapeCreation(point);
        break;
      case 'select':
        // Only start selection rectangle if clicking on SVG canvas, not on elements
        if (target.tagName === 'svg') {
          beginSelectionRectangle(point);
        }
        break;
      case 'edit':
        // Start command selection rectangle if clicking on SVG canvas (only when smooth brush is not active)
        if (target.tagName === 'svg' && !useCanvasStore.getState().smoothBrush.isActive) {
          beginSelectionRectangle(point, !e.shiftKey, false);
        }
        break;
      case 'subpath':
        // Start subpath selection rectangle if clicking on SVG canvas
        if (target.tagName === 'svg') {
          beginSelectionRectangle(point, false, !e.shiftKey);
        }
        break;
    }
  }, [activePlugin, screenToCanvas, isSpacePressed, useCanvasStore.getState().text.text]);
  /* eslint-enable react-hooks/exhaustive-deps */

  /* eslint-disable react-hooks/exhaustive-deps */
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
    if (dragStart && !transformState.isTransforming && !isSelecting && !isCreatingShape) {
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
            const canvasStart = screenToCanvas(dragStart.x, dragStart.y);
            const canvasCurrent = screenToCanvas(point.x, point.y);
            const deltaX = canvasCurrent.x - canvasStart.x;
            const deltaY = canvasCurrent.y - canvasStart.y;
            useCanvasStore.getState().moveSelectedSubpaths(deltaX, deltaY);
            setDragStart(point);
          }
          return;
        } else {
          // Move entire selected elements
          const deltaX = point.x - dragStart.x;
          const deltaY = point.y - dragStart.y;
          useCanvasStore.getState().moveSelectedElements(deltaX, deltaY);
          setDragStart(point);
        }
      }
      return;
    }

    if (transformState.isTransforming) {
      updateTransformation(point, e.shiftKey);
      return;
    }

    if (activePlugin === 'pencil' && e.buttons === 1) {
      useCanvasStore.getState().addPointToPath(point);
    }

    // Handle smooth brush in edit mode
    if (activePlugin === 'edit' && useCanvasStore.getState().smoothBrush.isActive && e.buttons === 1) {
      applySmoothBrush(point.x, point.y);
    }

    // Update smooth brush cursor position
    if (activePlugin === 'edit' && useCanvasStore.getState().smoothBrush.isActive) {
      updateSmoothBrushCursor(point.x, point.y);
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
      useCanvasStore.getState().moveSelectedSubpaths(deltaX, deltaY);
      setDragStart(point);
      return;
    }
  }, [activePlugin, screenToCanvas, isSpacePressed, isSelecting, selectionStart, viewport.zoom, isDragging, dragStart, isCreatingShape, shapeStart, transformState.isTransforming, updateTransformation, getElementBounds, getSubpathBounds, applySmoothBrush, updateSmoothBrushCursor]);
  /* eslint-enable react-hooks/exhaustive-deps */

  /* eslint-disable react-hooks/exhaustive-deps */
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // Subpath dragging functionality removed - will be reimplemented

    // Only handle dragging if it hasn't been handled by element click already
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setHasDragMoved(false); // Reset drag movement flag
      
      return;
    }

    if (transformState.isTransforming) {
      endTransformation();
      return;
    }

    // Auto-switch to select mode after drawing with pencil
    if (activePlugin === 'pencil') {
      useCanvasStore.getState().setActivePlugin('select');
    }

    if (isCreatingShape && shapeStart && shapeEnd) {
      // Create the shape
      endShapeCreation();
      return;
    }

    if (isSelecting && selectionStart && selectionEnd) {
      // Check if this was a click (no significant movement)
      const movementThreshold = 5; // pixels
      const deltaX = Math.abs(selectionEnd.x - selectionStart.x);
      const deltaY = Math.abs(selectionEnd.y - selectionStart.y);
      const isClick = deltaX < movementThreshold && deltaY < movementThreshold;

      if (isClick && activePlugin === 'select') {
        // For select mode, treat clicks on empty space as deselection
        const target = e.target as Element;
        const isCanvasClick = target.tagName === 'svg' || target === e.currentTarget;

        if (isCanvasClick && !isCreatingShape && !transformState.isTransforming && !e.shiftKey) {
          clearSelection();
          // Reset selection state to prevent mouse from staying "captured"
          completeSelectionRectangle();
        }
      } else {
        // Prevent the click event from firing after selection
        e.preventDefault();
        e.stopPropagation();

        completeSelectionRectangle();
      }
    }

    // Handle canvas click (deselection) for edit and subpath modes only
    // (select mode is handled above in the selection completion logic)
    const target = e.target as Element;
    const isCanvasClick = target.tagName === 'svg' || target === e.currentTarget;

    if (activePlugin === 'edit' && isCanvasClick && !justSelected &&
      !isSelecting && !isCreatingShape && !transformState.isTransforming && !e.shiftKey) {
      clearSelectedCommands();
    } else if (activePlugin === 'subpath' && isCanvasClick && !justSelected &&
      !isSelecting && !isCreatingShape && !transformState.isTransforming && !e.shiftKey) {
      clearSubpathSelection();
    }

    // Clean up any remaining drag state (in case of click without drag)
    if (dragStart && !isDragging) {
      setDragStart(null);
      setHasDragMoved(false);
    }
  }, [isDragging, isSelecting, selectionStart, selectionEnd, elements, activePlugin, isCreatingShape, shapeStart, shapeEnd, transformState.isTransforming, justSelected, dragStart]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Handle wheel events with passive: false to allow preventDefault
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svgElement.getBoundingClientRect();

      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;

      useCanvasStore.getState().zoom(factor, centerX, centerY);
    };

    svgElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      svgElement.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      width={canvasSize.width}
      height={canvasSize.height}
      viewBox={`${-viewport.panX / viewport.zoom} ${-viewport.panY / viewport.zoom} ${canvasSize.width / viewport.zoom} ${canvasSize.height / viewport.zoom}`}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        cursor: (isSpacePressed || activePlugin === 'pan') ? 'grabbing' :
          activePlugin === 'select' ? 'crosshair' :
            activePlugin === 'shape' ? 'crosshair' :
              (activePlugin === 'edit' && smoothBrush.isActive) ? 'none' : 'default'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <CanvasRenderer
        viewport={viewport}
        selectedIds={selectedIds}
        selectedCommands={selectedCommands}
        selectedSubpaths={selectedSubpaths}
        transformation={transformation}
        shape={shape}
        elements={elements}
        activePlugin={activePlugin}
        editingPoint={editingPoint}
        draggingSelection={draggingSelection}
        isSelecting={isSelecting}
        selectionStart={selectionStart}
        selectionEnd={selectionEnd}
        isCreatingShape={isCreatingShape}
        shapeStart={shapeStart}
        shapeEnd={shapeEnd}
        onElementClick={handleElementClick}
        onElementPointerDown={handleElementPointerDown}
        onTransformationHandlerPointerDown={handleTransformationHandlerPointerDown}
        onTransformationHandlerPointerUp={handleTransformationHandlerPointerUp}
        onStartDraggingPoint={startDraggingPoint}
        onUpdateDraggingPoint={updateDraggingPoint}
        onStopDraggingPoint={stopDraggingPoint}
        onUpdateElement={updateElement}
        onSelectCommand={selectCommand}
        onSelectSubpath={selectSubpath}
        onSetDragStart={setDragStart}
        getTransformationBounds={getTransformationBounds}
        isWorkingWithSubpaths={isWorkingWithSubpaths}
        getFilteredEditablePoints={getFilteredEditablePoints}
        getControlPointInfo={getControlPointInfo}
        smoothBrush={smoothBrush}
      />

      {/* Smooth Brush Cursor */}
      {activePlugin === 'edit' && smoothBrush.isActive && (
        <ellipse
          cx={smoothBrush.cursorX}
          cy={smoothBrush.cursorY}
          rx={smoothBrush.radius}
          ry={smoothBrush.radius}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.2"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Optical Alignment Overlay */}
      {activePlugin === 'select' && (
        <OpticalAlignmentOverlay
          alignment={currentAlignment}
          showMathematicalCenter={showMathematicalCenter}
          showOpticalCenter={showOpticalCenter}
          showDistanceRules={showDistanceRules}
          viewport={viewport}
        />
      )}

      {/* Transformation Overlay */}
      {((selectedIds.length > 0 && !isWorkingWithSubpaths()) || (selectedSubpaths.length > 0 && isWorkingWithSubpaths())) &&
        (isWorkingWithSubpaths() ? selectedSubpaths : selectedIds).map(item => {
          const elementId = typeof item === 'string' ? item : item.elementId;
          const element = elements.find(el => el.id === elementId);
          if (!element) return null;

          // Calculate bounds for the element or subpath
          let bounds = null;
          if (element.type === 'path') {
            if (isWorkingWithSubpaths()) {
              // For subpaths, calculate bounds for the specific subpath
              const subpathIndex = typeof item === 'string' ? 0 : item.subpathIndex;
              const pathData = element.data as import('../types').PathData;
              bounds = measureSubpathBounds(
                pathData.subPaths[subpathIndex],
                pathData.strokeWidth || 1,
                viewport.zoom
              );
            } else {
              // For regular elements, calculate full bounds
              bounds = getElementBounds(element);
            }
          }

          return (
            <TransformationOverlay
              key={isWorkingWithSubpaths() ? `subpath-${elementId}-${typeof item === 'string' ? 0 : item.subpathIndex}` : elementId}
              element={element}
              bounds={bounds}
              selectedSubpaths={selectedSubpaths}
              viewport={viewport}
              activePlugin={activePlugin}
              transformation={transformation}
              isWorkingWithSubpaths={isWorkingWithSubpaths()}
              onTransformationHandlerPointerDown={handleTransformationHandlerPointerDown}
              onTransformationHandlerPointerUp={handleTransformationHandlerPointerUp}
            />
          );
        })}

      <FeedbackOverlay
        viewport={viewport}
        canvasSize={canvasSize}
        rotationFeedback={feedback.rotation}
        resizeFeedback={feedback.resize}
        shapeFeedback={shapeFeedback.shape}
        pointPositionFeedback={shapeFeedback.pointPosition}
      />
    </svg>
  );
};