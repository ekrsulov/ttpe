import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { measurePath } from '../utils/measurementUtils';
import { transformPathData } from '../utils/transformationUtils';
import type { Point, PathData } from '../types';

interface CanvasProps {
  width?: number;
  height?: number;
}

export const Canvas: React.FC<CanvasProps> = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { elements, viewport, activePlugin, plugins, selectedIds } = useCanvasStore();

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
  const [originalElementData, setOriginalElementData] = useState<any | null>(null);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle keyboard events
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

  // Transform screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: screenX, y: screenY };

    const canvasX = (screenX - rect.left - viewport.panX) / viewport.zoom;
    const canvasY = (screenY - rect.top - viewport.panY) / viewport.zoom;

    return { x: canvasX, y: canvasY };
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
      setJustSelected(true);
      setTimeout(() => setJustSelected(false), 100);
    }
  }, [activePlugin, screenToCanvas, isDragging, hasDragMoved, dragStart]);

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

  // Helper function to get bounds - now simplified since transforms are applied directly
  const getTransformedBounds = (element: typeof elements[0]) => {
    // Since we now apply transformations directly to element coordinates,
    // getElementBounds already returns the correct transformed bounds
    return getElementBounds(element);
  };

  // Handle transformation handler pointer down
  const handleTransformationHandlerPointerDown = useCallback((e: React.PointerEvent, elementId: string, handler: string) => {
    e.stopPropagation();
    const point = screenToCanvas(e.clientX, e.clientY);
    const element = elements.find(el => el.id === elementId);

    if (element) {
      // Use original (untransformed) bounds for transformation calculations
      const bounds = getElementBounds(element);
      // Get current transformed bounds for transform origin calculation
      const transformedBounds = getTransformedBounds(element);
      
      if (bounds && transformedBounds) {
        setIsTransforming(true);
        setTransformStart(point);
        setTransformElementId(elementId);
        setTransformHandler(handler);
        setOriginalBounds(bounds); // Use original bounds for scale calculation
        setTransformedBounds(transformedBounds); // Use transformed bounds for transform origin
        setOriginalElementData(element.data); // Store original element data to prevent accumulation

        // Store current transform state to build upon it
        const currentTransform = getCurrentTransform();
        setInitialTransform(currentTransform);
      }
    }
  }, [elements, screenToCanvas, getElementBounds, getCurrentTransform]);

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
      case 'text':
        useCanvasStore.getState().addText(point.x, point.y, plugins.text.text);
        break;
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
    }
  }, [activePlugin, screenToCanvas, isSpacePressed, plugins.text.text]);

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
      // Handle transformation
      const element = elements.find(el => el.id === transformElementId);
      if (!element) return;

      // Calculate center of the original (untransformed) element
      const centerX = (originalBounds.minX + originalBounds.maxX) / 2;
      const centerY = (originalBounds.minY + originalBounds.maxY) / 2;

      // Start with current transform values
      let newScaleX = initialTransform.scaleX;
      let newScaleY = initialTransform.scaleY;
      let newRotation = initialTransform.rotation;
      let transformOriginX = centerX;
      let transformOriginY = centerY;

      // Set transform origin based on handler type
      if (transformHandler.startsWith('corner-')) {
        // Corner handlers: opposite corner becomes the transform origin
        switch (transformHandler) {
          case 'corner-tl': // Top-left corner
            transformOriginX = transformedBounds.maxX;
            transformOriginY = transformedBounds.maxY;
            break;
          case 'corner-tr': // Top-right corner
            transformOriginX = transformedBounds.minX;
            transformOriginY = transformedBounds.maxY;
            break;
          case 'corner-bl': // Bottom-left corner
            transformOriginX = transformedBounds.maxX;
            transformOriginY = transformedBounds.minY;
            break;
          case 'corner-br': // Bottom-right corner
            transformOriginX = transformedBounds.minX;
            transformOriginY = transformedBounds.minY;
            break;
        }
      } else if (transformHandler.startsWith('midpoint-')) {
        // Midpoint handlers: opposite side becomes the transform origin
        switch (transformHandler) {
          case 'midpoint-t': // Top handler
            transformOriginY = transformedBounds.maxY; // Bottom becomes fixed
            break;
          case 'midpoint-b': // Bottom handler
            transformOriginY = transformedBounds.minY; // Top becomes fixed
            break;
          case 'midpoint-l': // Left handler
            transformOriginX = transformedBounds.maxX; // Right becomes fixed
            break;
          case 'midpoint-r': // Right handler
            transformOriginX = transformedBounds.minX; // Left becomes fixed
            break;
        }
      }

      // Calculate transformation with damping to reduce sensitivity
      // NEW APPROACH: Use relative mouse movement from start position to prevent accumulation
      const SENSITIVITY_FACTOR = 0.3; // Further reduced sensitivity
      const MIN_MOVEMENT_THRESHOLD = 3; // Increased threshold
      
      // Calculate movement distance from start point
      const movementX = point.x - transformStart.x;
      const movementY = point.y - transformStart.y;
      const totalMovement = Math.sqrt(movementX * movementX + movementY * movementY);
      
      // Only apply transformation if movement exceeds threshold
      if (totalMovement < MIN_MOVEMENT_THRESHOLD) {
        return; // Skip transformation for tiny movements
      }
      
      // Calculate scale based on relative movement from initial position
      // This prevents accumulation by always calculating from the starting point
      if (transformHandler.startsWith('corner-')) {
        // For corner handlers: proportional scaling based on diagonal movement
        const diagonalMovement = Math.sqrt(movementX * movementX + movementY * movementY);
        const originalDiagonal = Math.sqrt(
          (originalBounds.maxX - originalBounds.minX) * (originalBounds.maxX - originalBounds.minX) + 
          (originalBounds.maxY - originalBounds.minY) * (originalBounds.maxY - originalBounds.minY)
        );
        
        // Calculate scale change based on movement relative to original size
        const scaleChange = 1 + (diagonalMovement * SENSITIVITY_FACTOR) / originalDiagonal;
        
        // Determine direction of scaling (towards or away from origin)
        const towardsOrigin = (
          (transformHandler === 'corner-tl' && (movementX > 0 || movementY > 0)) ||
          (transformHandler === 'corner-tr' && (movementX < 0 || movementY > 0)) ||
          (transformHandler === 'corner-bl' && (movementX > 0 || movementY < 0)) ||
          (transformHandler === 'corner-br' && (movementX < 0 || movementY < 0))
        );
        
        const finalScale = towardsOrigin ? 1 / scaleChange : scaleChange;
        newScaleX = Math.max(0.1, Math.min(5.0, finalScale));
        newScaleY = Math.max(0.1, Math.min(5.0, finalScale));
        
      } else if (transformHandler.startsWith('midpoint-')) {
        // For midpoint handlers: single-axis scaling based on perpendicular movement
        
        if (transformHandler === 'midpoint-t' || transformHandler === 'midpoint-b') {
          // Vertical scaling based on Y movement
          const originalHeight = originalBounds.maxY - originalBounds.minY;
          const scaleChange = 1 + (Math.abs(movementY) * SENSITIVITY_FACTOR) / originalHeight;
          
          const shrinking = (transformHandler === 'midpoint-t' && movementY > 0) || 
                          (transformHandler === 'midpoint-b' && movementY < 0);
          
          newScaleY = Math.max(0.1, Math.min(5.0, shrinking ? 1 / scaleChange : scaleChange));
          newScaleX = 1; // Keep original X scale
          
        } else if (transformHandler === 'midpoint-l' || transformHandler === 'midpoint-r') {
          // Horizontal scaling based on X movement  
          const originalWidth = originalBounds.maxX - originalBounds.minX;
          const scaleChange = 1 + (Math.abs(movementX) * SENSITIVITY_FACTOR) / originalWidth;
          
          const shrinking = (transformHandler === 'midpoint-l' && movementX > 0) || 
                          (transformHandler === 'midpoint-r' && movementX < 0);
          
          newScaleX = Math.max(0.1, Math.min(5.0, shrinking ? 1 / scaleChange : scaleChange));
          newScaleY = 1; // Keep original Y scale
        }
      }

      // Apply transformation directly to element data instead of using SVG transforms
      let transformedData;
      
      if (element.type === 'path') {
        // Use original element data to prevent accumulation
        const pathData = originalElementData as PathData;
        transformedData = transformPathData(
          pathData,
          newScaleX,
          newScaleY,
          transformOriginX,
          transformOriginY
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

      useCanvasStore.getState().updateElement(transformElementId, {
        data: transformedData
      });

      return;
    }

    if (activePlugin === 'pencil' && e.buttons === 1) {
      useCanvasStore.getState().addPointToPath(point);
    }

    if (isSelecting && selectionStart) {
      setSelectionEnd(point);
    }

    if (isCreatingShape && shapeStart) {
      setShapeEnd(point);
    }
  }, [activePlugin, screenToCanvas, isSpacePressed, isSelecting, selectionStart, viewport.zoom, isDragging, dragStart, isCreatingShape, shapeStart, isTransforming, transformStart, transformElementId, transformHandler, originalBounds, initialTransform, originalElementData, plugins.transformation, getElementBounds]);

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

      // Find elements within the box
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
    }

    // Clean up any remaining drag state (in case of click without drag)
    if (dragStart && !isDragging) {
      setDragStart(null);
      setHasDragMoved(false);
    }
  }, [isDragging, isSelecting, selectionStart, selectionEnd, elements, activePlugin, isCreatingShape, shapeStart, shapeEnd, isTransforming, justSelected, dragStart]);

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

  // Render selection box for selected elements
  const renderSelectionBox = (element: typeof elements[0]) => {
    // Use transformed bounds to account for current transformations
    const bounds = getTransformedBounds(element);

    if (!bounds) return null;

    const isTransformationMode = activePlugin === 'transformation';
    const handlerSize = 8 / viewport.zoom;

    return (
      <g>
        {/* Selection rectangle */}
        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.maxX - bounds.minX}
          height={bounds.maxY - bounds.minY}
          fill="none"
          stroke="#007bff"
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${3 / viewport.zoom} ${3 / viewport.zoom}`}
          pointerEvents="none"
        />

        {/* Transformation handlers */}
        {isTransformationMode && (
          <>
            {/* Corner handlers */}
            {/* Top-left */}
            <rect
              x={bounds.minX - handlerSize / 2}
              y={bounds.minY - handlerSize / 2}
              width={handlerSize}
              height={handlerSize}
              fill="#007bff"
              stroke="#fff"
              strokeWidth={1 / viewport.zoom}
              style={{ cursor: 'nw-resize' }}
              onPointerDown={(e) => handleTransformationHandlerPointerDown(e, element.id, 'corner-tl')}
              onPointerUp={handleTransformationHandlerPointerUp}
            />

            {/* Top-right */}
            <rect
              x={bounds.maxX - handlerSize / 2}
              y={bounds.minY - handlerSize / 2}
              width={handlerSize}
              height={handlerSize}
              fill="#007bff"
              stroke="#fff"
              strokeWidth={1 / viewport.zoom}
              style={{ cursor: 'ne-resize' }}
              onPointerDown={(e) => handleTransformationHandlerPointerDown(e, element.id, 'corner-tr')}
              onPointerUp={handleTransformationHandlerPointerUp}
            />

            {/* Bottom-left */}
            <rect
              x={bounds.minX - handlerSize / 2}
              y={bounds.maxY - handlerSize / 2}
              width={handlerSize}
              height={handlerSize}
              fill="#007bff"
              stroke="#fff"
              strokeWidth={1 / viewport.zoom}
              style={{ cursor: 'sw-resize' }}
              onPointerDown={(e) => handleTransformationHandlerPointerDown(e, element.id, 'corner-bl')}
              onPointerUp={handleTransformationHandlerPointerUp}
            />

            {/* Bottom-right */}
            <rect
              x={bounds.maxX - handlerSize / 2}
              y={bounds.maxY - handlerSize / 2}
              width={handlerSize}
              height={handlerSize}
              fill="#007bff"
              stroke="#fff"
              strokeWidth={1 / viewport.zoom}
              style={{ cursor: 'se-resize' }}
              onPointerDown={(e) => handleTransformationHandlerPointerDown(e, element.id, 'corner-br')}
              onPointerUp={handleTransformationHandlerPointerUp}
            />

            {/* Midpoint handlers */}
            {/* Top */}
            <rect
              x={bounds.minX + (bounds.maxX - bounds.minX) / 2 - handlerSize / 2}
              y={bounds.minY - handlerSize / 2}
              width={handlerSize}
              height={handlerSize}
              fill="#007bff"
              stroke="#fff"
              strokeWidth={1 / viewport.zoom}
              style={{ cursor: 'n-resize' }}
              onPointerDown={(e) => handleTransformationHandlerPointerDown(e, element.id, 'midpoint-t')}
              onPointerUp={handleTransformationHandlerPointerUp}
            />

            {/* Right */}
            <rect
              x={bounds.maxX - handlerSize / 2}
              y={bounds.minY + (bounds.maxY - bounds.minY) / 2 - handlerSize / 2}
              width={handlerSize}
              height={handlerSize}
              fill="#007bff"
              stroke="#fff"
              strokeWidth={1 / viewport.zoom}
              style={{ cursor: 'e-resize' }}
              onPointerDown={(e) => handleTransformationHandlerPointerDown(e, element.id, 'midpoint-r')}
              onPointerUp={handleTransformationHandlerPointerUp}
            />

            {/* Bottom */}
            <rect
              x={bounds.minX + (bounds.maxX - bounds.minX) / 2 - handlerSize / 2}
              y={bounds.maxY - handlerSize / 2}
              width={handlerSize}
              height={handlerSize}
              fill="#007bff"
              stroke="#fff"
              strokeWidth={1 / viewport.zoom}
              style={{ cursor: 's-resize' }}
              onPointerDown={(e) => handleTransformationHandlerPointerDown(e, element.id, 'midpoint-b')}
              onPointerUp={handleTransformationHandlerPointerUp}
            />

            {/* Left */}
            <rect
              x={bounds.minX - handlerSize / 2}
              y={bounds.minY + (bounds.maxY - bounds.minY) / 2 - handlerSize / 2}
              width={handlerSize}
              height={handlerSize}
              fill="#007bff"
              stroke="#fff"
              strokeWidth={1 / viewport.zoom}
              style={{ cursor: 'w-resize' }}
              onPointerDown={(e) => handleTransformationHandlerPointerDown(e, element.id, 'midpoint-l')}
              onPointerUp={handleTransformationHandlerPointerUp}
            />

            {/* Center X marker */}
            {(() => {
              const centerX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
              const centerY = bounds.minY + (bounds.maxY - bounds.minY) / 2;
              const xSize = 8 / viewport.zoom; // Size of the X
              
              return (
                <g>
                  {/* X lines */}
                  <line
                    x1={centerX - xSize / 2}
                    y1={centerY - xSize / 2}
                    x2={centerX + xSize / 2}
                    y2={centerY + xSize / 2}
                    stroke="red"
                    strokeWidth={2 / viewport.zoom}
                    pointerEvents="none"
                  />
                  <line
                    x1={centerX - xSize / 2}
                    y1={centerY + xSize / 2}
                    x2={centerX + xSize / 2}
                    y2={centerY - xSize / 2}
                    stroke="red"
                    strokeWidth={2 / viewport.zoom}
                    pointerEvents="none"
                  />
                </g>
              );
            })()}

            {/* Center coordinates */}
            {plugins.transformation.showCoordinates && (() => {
              const centerX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
              const centerY = bounds.minY + (bounds.maxY - bounds.minY) / 2;
              const fontSize = 10 / viewport.zoom;
              const padding = 4 / viewport.zoom;
              const borderRadius = 6 / viewport.zoom;
              const centerOffset = 15 / viewport.zoom; // Distance below the X marker
              const centerText = `${Math.round(centerX)}, ${Math.round(centerY)}`;
              const textWidth = centerText.length * fontSize * 0.6;
              
              return (
                <g>
                  <rect
                    x={centerX - textWidth / 2 - padding}
                    y={centerY + centerOffset}
                    width={textWidth + padding * 2}
                    height={fontSize + padding * 2}
                    fill="#6b7280"
                    rx={borderRadius}
                    ry={borderRadius}
                    pointerEvents="none"
                  />
                  <text
                    x={centerX}
                    y={centerY + centerOffset + fontSize / 2 + padding}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={fontSize}
                    fill="white"
                    fontFamily="Arial, sans-serif"
                    pointerEvents="none"
                    style={{ fontWeight: 'normal', userSelect: 'none' }}
                  >
                    {centerText}
                  </text>
                </g>
              );
            })()}

            {/* Measurement rulers */}
            {plugins.transformation.showRulers && (() => {
              const width = bounds.maxX - bounds.minX;
              const height = bounds.maxY - bounds.minY;
              const rulerOffset = 20 / viewport.zoom; // Distance from element
              const fontSize = 12 / viewport.zoom;
              
              return (
                <g>
                  {/* Bottom ruler (width) */}
                  <g>
                    {/* Ruler line */}
                    <line
                      x1={bounds.minX}
                      y1={bounds.maxY + rulerOffset}
                      x2={bounds.maxX}
                      y2={bounds.maxY + rulerOffset}
                      stroke="#666"
                      strokeWidth={1 / viewport.zoom}
                      pointerEvents="none"
                    />
                    {/* Left tick */}
                    <line
                      x1={bounds.minX}
                      y1={bounds.maxY + rulerOffset - 3 / viewport.zoom}
                      x2={bounds.minX}
                      y2={bounds.maxY + rulerOffset + 3 / viewport.zoom}
                      stroke="#666"
                      strokeWidth={1 / viewport.zoom}
                      pointerEvents="none"
                    />
                    {/* Right tick */}
                    <line
                      x1={bounds.maxX}
                      y1={bounds.maxY + rulerOffset - 3 / viewport.zoom}
                      x2={bounds.maxX}
                      y2={bounds.maxY + rulerOffset + 3 / viewport.zoom}
                      stroke="#666"
                      strokeWidth={1 / viewport.zoom}
                      pointerEvents="none"
                    />
                    {/* Width text */}
                    <text
                      x={bounds.minX + width / 2}
                      y={bounds.maxY + rulerOffset + 12 / viewport.zoom}
                      textAnchor="middle"
                      fontSize={fontSize}
                      fill="#666"
                      pointerEvents="none"
                      style={{ userSelect: 'none' }}
                    >
                      {Math.round(width)}px
                    </text>
                  </g>

                  {/* Right ruler (height) */}
                  <g>
                    {/* Ruler line */}
                    <line
                      x1={bounds.maxX + rulerOffset}
                      y1={bounds.minY}
                      x2={bounds.maxX + rulerOffset}
                      y2={bounds.maxY}
                      stroke="#666"
                      strokeWidth={1 / viewport.zoom}
                      pointerEvents="none"
                    />
                    {/* Top tick */}
                    <line
                      x1={bounds.maxX + rulerOffset - 3 / viewport.zoom}
                      y1={bounds.minY}
                      x2={bounds.maxX + rulerOffset + 3 / viewport.zoom}
                      y2={bounds.minY}
                      stroke="#666"
                      strokeWidth={1 / viewport.zoom}
                      pointerEvents="none"
                    />
                    {/* Bottom tick */}
                    <line
                      x1={bounds.maxX + rulerOffset - 3 / viewport.zoom}
                      y1={bounds.maxY}
                      x2={bounds.maxX + rulerOffset + 3 / viewport.zoom}
                      y2={bounds.maxY}
                      stroke="#666"
                      strokeWidth={1 / viewport.zoom}
                      pointerEvents="none"
                    />
                    {/* Height text */}
                    <text
                      x={bounds.maxX + rulerOffset + 12 / viewport.zoom}
                      y={bounds.minY + height / 2}
                      textAnchor="start"
                      fontSize={fontSize}
                      fill="#666"
                      pointerEvents="none"
                      transform={`rotate(90 ${bounds.maxX + rulerOffset + 12 / viewport.zoom} ${bounds.minY + height / 2})`}
                      style={{ userSelect: 'none' }}
                    >
                      {Math.round(height)}px
                    </text>
                  </g>
                </g>
              );
            })()}

            {/* Corner coordinates */}
            {plugins.transformation.showCoordinates && (() => {
              const coordinateOffset = 15 / viewport.zoom; // Distance from corners
              const fontSize = 10 / viewport.zoom;
              const padding = 4 / viewport.zoom;
              const borderRadius = 6 / viewport.zoom;
              
              return (
                <g>
                  {/* Top-left corner coordinates */}
                  <g>
                    {(() => {
                      const topLeftText = `${Math.round(bounds.minX)}, ${Math.round(bounds.minY)}`;
                      const rectWidth = topLeftText.length * fontSize * 0.6 + padding * 2;
                      const rectX = bounds.minX - coordinateOffset - padding * 6;
                      return (
                        <>
                          <rect
                            x={rectX}
                            y={bounds.minY - coordinateOffset - fontSize - padding}
                            width={rectWidth}
                            height={fontSize + padding * 2}
                            fill="#6b7280"
                            rx={borderRadius}
                            ry={borderRadius}
                            pointerEvents="none"
                          />
                          <text
                            x={rectX + rectWidth / 2}
                            y={bounds.minY - coordinateOffset - fontSize / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={fontSize}
                            fill="white"
                            fontFamily="Arial, sans-serif"
                            pointerEvents="none"
                            style={{ fontWeight: 'normal', userSelect: 'none' }}
                          >
                            {topLeftText}
                          </text>
                        </>
                      );
                    })()}
                  </g>
                  
                  {/* Bottom-right corner coordinates */}
                  <g>
                    {(() => {
                      const bottomRightText = `${Math.round(bounds.maxX)}, ${Math.round(bounds.maxY)}`;
                      const rectWidth = bottomRightText.length * fontSize * 0.6 + padding * 2;
                      const rectX = bounds.maxX + coordinateOffset;
                      return (
                        <>
                          <rect
                            x={rectX}
                            y={bounds.maxY + coordinateOffset}
                            width={rectWidth}
                            height={fontSize + padding * 2}
                            fill="#6b7280"
                            rx={borderRadius}
                            ry={borderRadius}
                            pointerEvents="none"
                          />
                          <text
                            x={rectX + rectWidth / 2}
                            y={bounds.maxY + coordinateOffset + fontSize / 2 + padding}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={fontSize}
                            fill="white"
                            fontFamily="Arial, sans-serif"
                            pointerEvents="none"
                            style={{ fontWeight: 'normal', userSelect: 'none' }}
                          >
                            {bottomRightText}
                          </text>
                        </>
                      );
                    })()}
                  </g>
                </g>
              );
            })()}
          </>
        )}
      </g>
    );
  };

  // Render elements
  const renderElement = (element: typeof elements[0]) => {
    const { data, type } = element;
    const isSelected = selectedIds.includes(element.id);

    switch (type) {
      case 'path': {
        const pathData = data as import('../types').PathData;

        return (
          <g key={element.id}>
            <path
              d={pathData.d}
              stroke={pathData.strokeColor}
              strokeWidth={pathData.strokeWidth}
              fill={pathData.fillColor}
              fillOpacity={pathData.fillOpacity}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              opacity={pathData.opacity}
              onPointerUp={(e) => handleElementClick(element.id, e)}
              onPointerDown={(e) => handleElementPointerDown(element.id, e)}
              style={{ 
                cursor: activePlugin === 'select' ? (isSelected ? 'move' : 'pointer') : 'default'
              }}
            />
            {isSelected && renderSelectionBox(element)}
          </g>
        );
      }

      default:
        return null;
    }
  };

  // Sort elements by zIndex
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

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
        cursor: (isSpacePressed || activePlugin === 'pan') ? 'grabbing' : activePlugin === 'select' ? 'crosshair' : activePlugin === 'shape' ? 'crosshair' : 'default'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {sortedElements.map(renderElement)}
      {isSelecting && selectionStart && selectionEnd && (
        <rect
          x={Math.min(selectionStart.x, selectionEnd.x)}
          y={Math.min(selectionStart.y, selectionEnd.y)}
          width={Math.abs(selectionEnd.x - selectionStart.x)}
          height={Math.abs(selectionEnd.y - selectionStart.y)}
          fill="rgba(0, 123, 255, 0.1)"
          stroke="#007bff"
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
        />
      )}
      {isCreatingShape && shapeStart && shapeEnd && (() => {
        const selectedShape = plugins.shape.selectedShape;
        
        // Calculate shape dimensions
        const width = Math.abs(shapeEnd.x - shapeStart.x);
        const height = Math.abs(shapeEnd.y - shapeStart.y);
        const centerX = (shapeStart.x + shapeEnd.x) / 2;
        const centerY = (shapeStart.y + shapeEnd.y) / 2;
        
        let pathData = '';
        
        switch (selectedShape) {
          case 'square':
            const halfSize = Math.min(width, height) / 2;
            pathData = `M ${centerX - halfSize} ${centerY - halfSize} L ${centerX + halfSize} ${centerY - halfSize} L ${centerX + halfSize} ${centerY + halfSize} L ${centerX - halfSize} ${centerY + halfSize} Z`;
            break;
            
          case 'rectangle':
            pathData = `M ${shapeStart.x} ${shapeStart.y} L ${shapeEnd.x} ${shapeStart.y} L ${shapeEnd.x} ${shapeEnd.y} L ${shapeStart.x} ${shapeEnd.y} Z`;
            break;
            
          case 'circle':
            // Create a circle using C commands (Bézier curves)
            const radius = Math.min(width, height) / 2;
            const kappa = 0.552284749831; // Control point constant for circle approximation
            
            // Calculate control points
            const cx1 = centerX - radius;
            const cy1 = centerY - radius * kappa;
            const cx2 = centerX - radius * kappa;
            const cy2 = centerY - radius;
            const cx3 = centerX + radius * kappa;
            const cy3 = centerY - radius;
            const cx4 = centerX + radius;
            const cy4 = centerY - radius * kappa;
            const cx5 = centerX + radius;
            const cy5 = centerY + radius * kappa;
            const cx6 = centerX + radius * kappa;
            const cy6 = centerY + radius;
            const cx7 = centerX - radius * kappa;
            const cy7 = centerY + radius;
            const cx8 = centerX - radius;
            const cy8 = centerY + radius * kappa;
            
            pathData = `M ${centerX - radius} ${centerY} C ${cx1} ${cy1} ${cx2} ${cy2} ${centerX} ${centerY - radius} C ${cx3} ${cy3} ${cx4} ${cy4} ${centerX + radius} ${centerY} C ${cx5} ${cy5} ${cx6} ${cy6} ${centerX} ${centerY + radius} C ${cx7} ${cy7} ${cx8} ${cy8} ${centerX - radius} ${centerY} Z`;
            break;
            
          case 'triangle':
            pathData = `M ${centerX} ${shapeStart.y} L ${shapeEnd.x} ${shapeEnd.y} L ${shapeStart.x} ${shapeEnd.y} Z`;
            break;
        }
        
        return (
          <path
            d={pathData}
            stroke="#007bff"
            strokeWidth={1 / viewport.zoom}
            fill="none"
            strokeOpacity={0.7}
            strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
          />
        );
      })()}
    </svg>
  );
};