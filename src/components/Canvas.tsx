import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { measurePath } from '../utils/measurementUtils';
import { transformPathData } from '../utils/transformationUtils';
import { CanvasRenderer } from './CanvasRenderer';
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

  // Handle transformation handler pointer down
  const handleTransformationHandlerPointerDown = useCallback((e: React.PointerEvent, elementId: string, handler: string) => {
    e.stopPropagation();
    const point = screenToCanvas(e.clientX, e.clientY);
    const element = elements.find(el => el.id === elementId);

    if (element) {
      // Use original (untransformed) bounds for transformation calculations
      const bounds = getElementBounds(element);
      // Get current transformed bounds for transform origin calculation
      const transformedBounds = getElementBounds(element);
      
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
      <CanvasRenderer
        viewport={viewport}
        selectedIds={selectedIds}
        plugins={plugins}
        elements={elements}
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
      />
    </svg>
  );
};