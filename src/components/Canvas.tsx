import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { measurePath } from '../utils/measurementUtils';
import { transformPathData, transformSubpathsData, transformSingleSubpath } from '../utils/transformationUtils';
import { parsePathD, extractEditablePoints, extractSubpaths } from '../utils/pathParserUtils';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../utils';
import { CanvasRenderer } from './CanvasRenderer';
import { transformManager, type TransformBounds } from '../utils/transformManager';
import type { Point, PathData, CanvasElement } from '../types';

interface CanvasProps {
  width?: number;
  height?: number;
}

export const Canvas: React.FC<CanvasProps> = () => {
  const svgRef = useRef<SVGSVGElement>(null);
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
    subpath,
    updateElement,
    startDraggingPoint,
    updateDraggingPoint,
    stopDraggingPoint,
    emergencyCleanupDrag,
    selectCommand,
    clearSelectedCommands,
    deleteSelectedCommands,
    selectSubpath,
    startDraggingSubpath,
    updateDraggingSubpath,
    stopDraggingSubpath,
    getTransformationBounds,
    isWorkingWithSubpaths,
    getFilteredEditablePoints,
    smoothBrush,
    applySmoothBrush,
    updateSmoothBrushCursor
  } = useCanvasStore();

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [hasDragMoved, setHasDragMoved] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [justSelected, setJustSelected] = useState(false);
  
  // State for shape creation
  const [shapeStart, setShapeStart] = useState<Point | null>(null);
  const [shapeEnd, setShapeEnd] = useState<Point | null>(null);
  const [isCreatingShape, setIsCreatingShape] = useState(false);

  // State for transformation
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformStart, setTransformStart] = useState<Point | null>(null);
  const [transformElementId, setTransformElementId] = useState<string | null>(null);
  const [transformHandler, setTransformHandler] = useState<string | null>(null);
  const [originalBounds, setOriginalBounds] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  const [transformedBounds, setTransformedBounds] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  const [initialTransform, setInitialTransform] = useState<{ scaleX: number; scaleY: number; rotation: number; translateX: number; translateY: number } | null>(null);
  const [originalElementData, setOriginalElementData] = useState<PathData | null>(null);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle keyboard events
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't activate pan mode if user is typing in an input or textarea
      if (e.code === 'Space' && !e.repeat) {
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).contentEditable === 'true'
        );

        if (!isInputFocused) {
          setIsSpacePressed(true);
          e.preventDefault();
        }
      }

      // Handle Delete key for deleting selected commands
      if (e.code === 'Delete' || e.code === 'Backspace') {
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).contentEditable === 'true'
        );

        // Only delete if not typing in an input and we have selected commands
        if (!isInputFocused && selectedCommands.length > 0) {
          deleteSelectedCommands();
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

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
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: formatToPrecision(screenX, PATH_DECIMAL_PRECISION), y: formatToPrecision(screenY, PATH_DECIMAL_PRECISION) };

    const canvasX = (screenX - rect.left - viewport.panX) / viewport.zoom;
    const canvasY = (screenY - rect.top - viewport.panY) / viewport.zoom;

    return { x: formatToPrecision(canvasX, PATH_DECIMAL_PRECISION), y: formatToPrecision(canvasY, PATH_DECIMAL_PRECISION) };
  }, [viewport]);

    // Handle element click
  /* eslint-disable react-hooks/exhaustive-deps */
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
      setJustSelected(true);
      setTimeout(() => setJustSelected(false), 100);
    }
  }, [activePlugin, screenToCanvas, isDragging, hasDragMoved, dragStart]);
  /* eslint-enable react-hooks/exhaustive-deps */

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
      return measurePath(pathData.d, pathData.strokeWidth, viewport.zoom);
    }
    return null;
  };

  // Helper function to get current element transform (now always returns defaults since transforms are applied directly)
  const getCurrentTransform = () => {
    // Since we now apply transformations directly to element coordinates,
    // we always return default transform values
    return {
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      translateX: 0,
      translateY: 0
    };
  };

  // Get bounds for a specific subpath
  const getSubpathBounds = (element: CanvasElement, subpathIndex: number) => {
    if (element.type !== 'path') return null;
    
    try {
      const pathData = element.data as PathData;
      const commands = parsePathD(pathData.d);
      const subpaths = extractSubpaths(commands);
      
      if (subpathIndex >= subpaths.length) return null;
      
      const subpath = subpaths[subpathIndex];
      return measurePath(subpath.d, pathData.strokeWidth || 1, viewport.zoom);
    } catch (error) {
      console.warn('Failed to calculate individual subpath bounds:', error);
      return null;
    }
  };

  // Handle transformation handler pointer down
  /* eslint-disable react-hooks/exhaustive-deps */
  const handleTransformationHandlerPointerDown = useCallback((e: React.PointerEvent, elementId: string, handler: string) => {
    e.stopPropagation();
    const point = screenToCanvas(e.clientX, e.clientY);
    
    // Check if we're working with individual subpaths
    const isSubpathTransformation = elementId.startsWith('subpath:');
    let actualElementId: string;
    
    if (isSubpathTransformation) {
      // New format: "subpath:elementId:subpathIndex"
      const parts = elementId.split(':');
      actualElementId = parts[1];
    } else {
      // Legacy or regular element format
      actualElementId = elementId.replace('subpaths:', '');
    }
    
    const element = elements.find(el => el.id === actualElementId);

    if (element) {
      let bounds;
      let transformedBounds;
      
      // For individual subpaths, use the specific subpath bounds instead of the entire element bounds
      if (isSubpathTransformation && elementId.startsWith('subpath:')) {
        const parts = elementId.split(':');
        const subpathIndex = parseInt(parts[2]);
        const subpathBounds = getSubpathBounds(element, subpathIndex);
        
        if (subpathBounds) {
          bounds = subpathBounds;
          transformedBounds = subpathBounds;
        } else {
          // Fallback to element bounds if subpath bounds calculation fails
          bounds = getElementBounds(element);
          transformedBounds = getElementBounds(element);
        }
      } else {
        // Use element bounds for regular elements or legacy subpath format
        bounds = getElementBounds(element);
        transformedBounds = getElementBounds(element);
      }
      
      if (bounds && transformedBounds) {
        setIsTransforming(true);
        setTransformStart(point);
        setTransformElementId(elementId); // Keep the full elementId including 'subpaths:' prefix
        setTransformHandler(handler);
        setOriginalBounds(bounds); // Use original bounds for scale calculation
        setTransformedBounds(transformedBounds); // Use transformed bounds for transform origin
        setOriginalElementData(element.data); // Store original element data to prevent accumulation

        // Store current transform state to build upon it
        const currentTransform = getCurrentTransform();
        setInitialTransform(currentTransform);
      }
    }
  }, [elements, screenToCanvas, getElementBounds, getSubpathBounds, getCurrentTransform, getTransformationBounds]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleTransformationHandlerPointerUp = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    
    // Reset all transformation state
    setIsTransforming(false);
    setTransformStart(null);
    setTransformElementId(null);
    setTransformHandler(null);
    setOriginalBounds(null);
    setTransformedBounds(null);
    setInitialTransform(null);
    setOriginalElementData(null);
  }, []);

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
        setIsCreatingShape(true);
        setShapeStart(point);
        setShapeEnd(point);
        break;
      case 'select':
        // Only start selection rectangle if clicking on SVG canvas, not on elements
        if (target.tagName === 'svg') {
          setIsSelecting(true);
          setSelectionStart(point);
          setSelectionEnd(point);
        }
        break;
      case 'edit':
        // Start command selection rectangle if clicking on SVG canvas (only when smooth brush is not active)
        if (target.tagName === 'svg' && !smoothBrush.isActive) {
          setIsSelecting(true);
          setSelectionStart(point);
          setSelectionEnd(point);
          // Clear previous command selection
          clearSelectedCommands();
        }
        break;
      case 'subpath':
        // Start subpath selection rectangle if clicking on SVG canvas
        if (target.tagName === 'svg') {
          setIsSelecting(true);
          setSelectionStart(point);
          setSelectionEnd(point);
          // Clear previous subpath selection
          useCanvasStore.getState().clearSubpathSelection();
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
      useCanvasStore.getState().pan(deltaX / viewport.zoom, deltaY / viewport.zoom);
      return;
    }

    if (activePlugin === 'pan' && e.buttons === 1) {
      // Pan the canvas with pan tool + pointer button
      const deltaX = e.movementX;
      const deltaY = e.movementY;
      useCanvasStore.getState().pan(deltaX / viewport.zoom, deltaY / viewport.zoom);
      return;
    }

    // Check for potential element dragging (when we have dragStart but may not be isDragging yet)
    if (dragStart && !isTransforming && !isSelecting && !isCreatingShape) {
      const deltaX = point.x - dragStart.x;
      const deltaY = point.y - dragStart.y;
      
      // Only start actual dragging if we've moved more than a threshold
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        if (!isDragging) {
          setIsDragging(true); // Start dragging now
        }
        setHasDragMoved(true);
        useCanvasStore.getState().moveSelectedElements(deltaX, deltaY);
        setDragStart(point);
      }
      return;
    }

    if (isTransforming && transformStart && transformElementId && transformHandler && originalBounds && transformedBounds && initialTransform && originalElementData) {
      // Check if we're working with subpaths
      const isSubpathTransformation = transformElementId.startsWith('subpath:') || transformElementId.startsWith('subpaths:');
      let actualElementId: string;
      let targetSubpathIndex: number | null = null;
      
      if (transformElementId.startsWith('subpath:')) {
        // New format: "subpath:elementId:subpathIndex"
        const parts = transformElementId.split(':');
        actualElementId = parts[1];
        targetSubpathIndex = parseInt(parts[2]);
      } else {
        // Legacy format
        actualElementId = isSubpathTransformation ? transformElementId.replace('subpaths:', '') : transformElementId;
      }
      
      // Handle transformation
      const element = elements.find(el => el.id === actualElementId);
      if (!element) return;

      // Create transform bounds for the manager
      const bounds: TransformBounds = {
        x: originalBounds.minX,
        y: originalBounds.minY,
        width: originalBounds.maxX - originalBounds.minX,
        height: originalBounds.maxY - originalBounds.minY,
        center: {
          x: (originalBounds.minX + originalBounds.maxX) / 2,
          y: (originalBounds.minY + originalBounds.maxY) / 2
        }
      };

      let newScaleX = initialTransform.scaleX;
      let newScaleY = initialTransform.scaleY;
      let newRotation = initialTransform.rotation;
      let transformOriginX = bounds.center.x;
      let transformOriginY = bounds.center.y;

      // Use the transform manager for natural calculations
      if (transformHandler.startsWith('corner-') || transformHandler.startsWith('midpoint-')) {
        // Use the same scale calculation for both paths and subpaths since bounds are identical
        const scaleResult = transformManager.calculateScale(
          transformHandler,
          point,
          transformStart,
          bounds
        );
        
        newScaleX = scaleResult.scaleX;
        newScaleY = scaleResult.scaleY;
        transformOriginX = scaleResult.originX;
        transformOriginY = scaleResult.originY;
        
      } else if (transformHandler.startsWith('rotate-')) {
        // Calculate rotation using the transform manager
        const rotationResult = transformManager.calculateRotation(
          point,
          transformStart,
          bounds
        );
        
        newRotation = initialTransform.rotation + rotationResult.angle;
        transformOriginX = rotationResult.centerX;
        transformOriginY = rotationResult.centerY;
        
        // Keep rotation within reasonable bounds (-180 to 180)
        while (newRotation > 180) newRotation -= 360;
        while (newRotation < -180) newRotation += 360;
      }

      // Apply transformation directly to element data instead of using SVG transforms
      if (isSubpathTransformation && targetSubpathIndex !== null) {
        // Apply transformation to the specific subpath using individual subpath transformation
        const pathData = originalElementData as PathData;
        const transformedData = transformSingleSubpath(
          pathData,
          targetSubpathIndex,
          newScaleX,
          newScaleY,
          transformOriginX,
          transformOriginY,
          newRotation
        );
        
        useCanvasStore.getState().updateElement(actualElementId, {
          data: transformedData
        });
      } else if (isSubpathTransformation) {
        // Legacy: transform all selected subpaths
        const pathData = originalElementData as PathData;
        const transformedData = transformSubpathsData(
          pathData,
          newScaleX,
          newScaleY,
          transformOriginX,
          transformOriginY,
          newRotation,
          selectedSubpaths // Pass the selected subpaths
        );
        
        useCanvasStore.getState().updateElement(actualElementId, {
          data: transformedData
        });
      } else {
        // Apply transformation to the entire element (original behavior)
        let transformedData;
        
        if (element.type === 'path') {
          // Use original element data to prevent accumulation
          const pathData = originalElementData as PathData;
          transformedData = transformPathData(
            pathData,
            newScaleX,
            newScaleY,
            transformOriginX,
            transformOriginY,
            newRotation
          );
        } else {
          // Fallback to transform approach for other element types
          transformedData = { 
            ...originalElementData, 
            transform: {
              scaleX: newScaleX,
              scaleY: newScaleY, 
              rotation: newRotation,
              translateX: transformOriginX,
              translateY: transformOriginY,
            }
          };
        }

        useCanvasStore.getState().updateElement(actualElementId, {
          data: transformedData
        });
      }

      return;
    }

    if (activePlugin === 'pencil' && e.buttons === 1) {
      useCanvasStore.getState().addPointToPath(point);
    }

    // Handle smooth brush in edit mode
    if (activePlugin === 'edit' && smoothBrush.isActive && e.buttons === 1) {
      applySmoothBrush(point.x, point.y);
    }

    // Update smooth brush cursor position
    if (activePlugin === 'edit' && smoothBrush.isActive) {
      updateSmoothBrushCursor(point.x, point.y);
    }

    if (isSelecting && selectionStart) {
      setSelectionEnd(point);
    }

    if (isCreatingShape && shapeStart) {
      setShapeEnd(point);
    }
  }, [activePlugin, screenToCanvas, isSpacePressed, isSelecting, selectionStart, viewport.zoom, isDragging, dragStart, isCreatingShape, shapeStart, isTransforming, transformStart, transformElementId, transformHandler, originalBounds, initialTransform, originalElementData, useCanvasStore.getState().transformation, getElementBounds, getSubpathBounds, smoothBrush.isActive, applySmoothBrush, updateSmoothBrushCursor]);
  /* eslint-enable react-hooks/exhaustive-deps */

  /* eslint-disable react-hooks/exhaustive-deps */
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // Only handle dragging if it hasn't been handled by element click already
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setHasDragMoved(false); // Reset drag movement flag
      return;
    }

    if (isTransforming) {
      setIsTransforming(false);
      setTransformStart(null);
      setTransformElementId(null);
      setTransformHandler(null);
      setOriginalBounds(null);
      setTransformedBounds(null); // Reset transformed bounds as well
      setInitialTransform(null);
      setOriginalElementData(null);
      return;
    }

    // Auto-switch to select mode after drawing with pencil
    if (activePlugin === 'pencil') {
      useCanvasStore.getState().setActivePlugin('select');
    }

    if (isCreatingShape && shapeStart && shapeEnd) {
      // Create the shape
      useCanvasStore.getState().createShape(shapeStart, shapeEnd);
      
      // Reset shape creation state
      setIsCreatingShape(false);
      setShapeStart(null);
      setShapeEnd(null);
      return;
    }

    if (isSelecting && selectionStart && selectionEnd) {
      // Prevent the click event from firing after selection
      e.preventDefault();
      e.stopPropagation();

      // Calculate selection box in canvas coordinates
      const selectionMinX = Math.min(selectionStart.x, selectionEnd.x);
      const selectionMaxX = Math.max(selectionStart.x, selectionEnd.x);
      const selectionMinY = Math.min(selectionStart.y, selectionEnd.y);
      const selectionMaxY = Math.max(selectionStart.y, selectionEnd.y);

      if (activePlugin === 'edit') {
        // Select commands within the selection box
        const selectedCommands: Array<{elementId: string, commandIndex: number, pointIndex: number}> = [];
        
        elements.forEach(el => {
          if (el.type === 'path') {
            const pathData = el.data as PathData;
            const commands = parsePathD(pathData.d);
            const points = extractEditablePoints(commands);
            
            points.forEach(point => {
              if (point.x >= selectionMinX && point.x <= selectionMaxX &&
                  point.y >= selectionMinY && point.y <= selectionMaxY) {
                selectedCommands.push({
                  elementId: el.id,
                  commandIndex: point.commandIndex,
                  pointIndex: point.pointIndex
                });
              }
            });
          }
        });
        
        // Select all found commands
        selectedCommands.forEach(command => selectCommand(command, true));
      } else if (activePlugin === 'subpath') {
        // Select subpaths within the selection box
        const selectedSubpathsList: Array<{elementId: string, subpathIndex: number}> = [];
        
        elements.forEach(el => {
          if (el.type === 'path' && selectedIds.includes(el.id)) {
            const pathData = el.data as PathData;
            const commands = parsePathD(pathData.d);
            const subpaths = extractSubpaths(commands);
            
            subpaths.forEach((subpathData: { d: string; startIndex: number; endIndex: number }, index: number) => {
              // Check if subpath intersects with selection box
              const subpathBounds = measurePath(subpathData.d, pathData.strokeWidth || 1, viewport.zoom);
              
              const intersects = !(subpathBounds.maxX < selectionMinX ||
                         subpathBounds.minX > selectionMaxX ||
                         subpathBounds.maxY < selectionMinY ||
                         subpathBounds.minY > selectionMaxY);
              
              if (intersects) {
                selectedSubpathsList.push({
                  elementId: el.id,
                  subpathIndex: index
                });
              }
            });
          }
        });
        
        // Select all found subpaths (clear previous selection if not shift-selecting)
        if (selectedSubpathsList.length > 0) {
          useCanvasStore.getState().selectSubpaths(selectedSubpathsList);
        }
      } else {
        // Original element selection logic
        const selectedIds = elements
          .filter(el => {
            if (el.type === 'path') {
              const pathData = el.data as import('../types').PathData;
              // Check if the path bounds intersect with the selection box
              const pathBounds = measurePath(pathData.d, pathData.strokeWidth, viewport.zoom);

              // Check for intersection between path bounds and selection bounds
              const intersects = !(pathBounds.maxX < selectionMinX ||
                       pathBounds.minX > selectionMaxX ||
                       pathBounds.maxY < selectionMinY ||
                       pathBounds.minY > selectionMaxY);

              return intersects;
            }
            return false;
          })
          .map(el => el.id);

        useCanvasStore.getState().selectElements(selectedIds);
      }
      
      // Mark that we just made a selection to prevent immediate clearing
      setJustSelected(true);
      setTimeout(() => setJustSelected(false), 100);
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);

    // Handle canvas click (deselection) only if clicking on empty space
    // and not currently in any other interaction mode
    const target = e.target as Element;
    const isCanvasClick = target.tagName === 'svg' || target === e.currentTarget;

    if (activePlugin === 'select' && isCanvasClick && !justSelected && 
        !isSelecting && !isCreatingShape && !isTransforming) {
      useCanvasStore.getState().clearSelection();
    } else if (activePlugin === 'edit' && isCanvasClick && !justSelected && 
               !isSelecting && !isCreatingShape && !isTransforming) {
      clearSelectedCommands();
    }

    // Clean up any remaining drag state (in case of click without drag)
    if (dragStart && !isDragging) {
      setDragStart(null);
      setHasDragMoved(false);
    }
  }, [isDragging, isSelecting, selectionStart, selectionEnd, elements, activePlugin, isCreatingShape, shapeStart, shapeEnd, isTransforming, justSelected, dragStart]);
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
        subpath={subpath}
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
        onStartDraggingSubpath={startDraggingSubpath}
        onUpdateDraggingSubpath={updateDraggingSubpath}
        onStopDraggingSubpath={stopDraggingSubpath}
        getTransformationBounds={getTransformationBounds}
        isWorkingWithSubpaths={isWorkingWithSubpaths}
        getFilteredEditablePoints={getFilteredEditablePoints}
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
    </svg>
  );
};