import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { measureText, measurePath } from '../utils/measurementUtils';
import type { Point } from '../types';

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
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [justSelected, setJustSelected] = useState(false);
  
  // State for shape creation
  const [shapeStart, setShapeStart] = useState<Point | null>(null);
  const [shapeEnd, setShapeEnd] = useState<Point | null>(null);
  const [isCreatingShape, setIsCreatingShape] = useState(false);

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

  // Handle canvas click (empty space)
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only clear selection if clicking on the SVG canvas itself, not on elements
    const target = e.target as Element;
    const isCanvasClick = target.tagName === 'svg' || target === e.currentTarget;

    if (activePlugin === 'select' && isCanvasClick && !justSelected) {
      useCanvasStore.getState().clearSelection();
    }
  }, [activePlugin, justSelected]);

  // Handle element click
  const handleElementClick = useCallback((elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePlugin === 'select') {
      const selectedIds = useCanvasStore.getState().selectedIds;
      const isElementSelected = selectedIds.includes(elementId);
      const hasMultipleSelection = selectedIds.length > 1;
      
      // If clicking on an already selected element within a multi-selection, keep the multi-selection
      if (isElementSelected && hasMultipleSelection && !e.shiftKey) {
        // Don't change selection, just prepare for dragging
        const point = screenToCanvas(e.clientX, e.clientY);
        setDragStart(point);
        return;
      }
      
      // Otherwise, use normal selection logic
      useCanvasStore.getState().selectElement(elementId, e.shiftKey);

      // Set drag start for the clicked element (it should be selected now)
      const point = screenToCanvas(e.clientX, e.clientY);
      setDragStart(point);
    }
  }, [activePlugin, screenToCanvas]);

  // Handle element mouse down for drag
  const handleElementMouseDown = useCallback((elementId: string, e: React.MouseEvent) => {
    if (activePlugin === 'select') {
      e.stopPropagation(); // Prevent handleMouseDown from starting selection rectangle
      
      const selectedIds = useCanvasStore.getState().selectedIds;
      const isElementSelected = selectedIds.includes(elementId);
      
      // If element is not selected, select it first
      if (!isElementSelected) {
        useCanvasStore.getState().selectElement(elementId, false);
      }
      
      const point = screenToCanvas(e.clientX, e.clientY);
      setIsDragging(true);
      setDragStart(point);
    }
  }, [activePlugin, screenToCanvas]);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
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

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const point = screenToCanvas(e.clientX, e.clientY);

    if (isSpacePressed && e.buttons === 1) {
      // Pan the canvas with spacebar + mouse button
      const deltaX = e.movementX;
      const deltaY = e.movementY;
      useCanvasStore.getState().pan(deltaX / viewport.zoom, deltaY / viewport.zoom);
      return;
    }

    if (activePlugin === 'pan' && e.buttons === 1) {
      // Pan the canvas with pan tool + mouse button
      const deltaX = e.movementX;
      const deltaY = e.movementY;
      useCanvasStore.getState().pan(deltaX / viewport.zoom, deltaY / viewport.zoom);
      return;
    }

    if (isDragging && dragStart) {
      // Move selected elements
      const deltaX = point.x - dragStart.x;
      const deltaY = point.y - dragStart.y;
      useCanvasStore.getState().moveSelectedElements(deltaX, deltaY);
      setDragStart(point);
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
  }, [activePlugin, screenToCanvas, isSpacePressed, isSelecting, selectionStart, viewport.zoom, isDragging, dragStart, isCreatingShape, shapeStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
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
          } else if (el.type === 'text') {
            const textData = el.data as import('../types').TextData;

            // Get text dimensions in screen pixels
            const { width: textWidth, height: textHeight } = measureText(
              textData.text,
              textData.fontSize,
              textData.fontFamily,
              textData.fontWeight,
              textData.fontStyle,
              textData.textDecoration,
              viewport.zoom // Use current zoom for consistent measurements
            );

            // Convert text dimensions to canvas coordinates
            const canvasTextWidth = textWidth / viewport.zoom;
            const canvasTextHeight = textHeight / viewport.zoom;

            // Calculate text bounding box in canvas coordinates
            const textMinX = textData.x;
            const textMaxX = textData.x + canvasTextWidth;
            const textMinY = textData.y - canvasTextHeight;
            const textMaxY = textData.y;

            // Check for intersection between text bounds and selection bounds
            const intersects = !(textMaxX < selectionMinX ||
                     textMinX > selectionMaxX ||
                     textMaxY < selectionMinY ||
                     textMinY > selectionMaxY);

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
  }, [isDragging, isSelecting, selectionStart, selectionEnd, elements, activePlugin, isCreatingShape, shapeStart, shapeEnd]);

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
    let bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

    if (element.type === 'path') {
      const pathData = element.data as import('../types').PathData;
      // Use precise path measurement with ghost canvas (considering stroke width)
      bounds = measurePath(pathData.d, pathData.strokeWidth, viewport.zoom);
    } else if (element.type === 'text') {
      const textData = element.data as import('../types').TextData;

      // Use precise text measurement with ghost canvas
      const { width: textWidth, height: textHeight } = measureText(
        textData.text,
        textData.fontSize,
        textData.fontFamily,
        textData.fontWeight,
        textData.fontStyle,
        textData.textDecoration,
        viewport.zoom
      );

      bounds = {
        minX: textData.x,
        minY: textData.y - textHeight,
        maxX: textData.x + textWidth,
        maxY: textData.y,
      };
    }

    if (!bounds) return null;

    return (
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
              strokeWidth={pathData.strokeWidth * viewport.zoom}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={pathData.opacity}
              onClick={(e) => handleElementClick(element.id, e)}
              onMouseDown={(e) => handleElementMouseDown(element.id, e)}
              style={{ 
                cursor: activePlugin === 'select' ? (isSelected ? 'move' : 'pointer') : 'default'
              }}
            />
            {isSelected && renderSelectionBox(element)}
          </g>
        );
      }

      case 'text': {
        const textData = data as import('../types').TextData;
        return (
          <g key={element.id}>
            <text
              x={textData.x}
              y={textData.y}
              fontSize={textData.fontSize * viewport.zoom}
              fontFamily={textData.fontFamily}
              fontWeight={textData.fontWeight}
              fontStyle={textData.fontStyle}
              fill={textData.color}
              opacity={textData.opacity}
              style={{ 
                userSelect: 'none', 
                cursor: activePlugin === 'select' ? (isSelected ? 'move' : 'pointer') : 'default',
                textDecoration: textData.textDecoration !== 'none' ? textData.textDecoration : undefined
              }}
              onClick={(e) => handleElementClick(element.id, e)}
              onMouseDown={(e) => handleElementMouseDown(element.id, e)}
            >
              {textData.text}
            </text>
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
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={(e) => handleMouseUp(e)}
      onClick={(e) => handleCanvasClick(e)}
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