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
  const { elements, viewport, activePlugin, plugins } = useCanvasStore();

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [justSelected, setJustSelected] = useState(false);

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
      useCanvasStore.getState().selectElement(elementId, e.shiftKey);

      // Only set drag start if the element is selected (for potential drag)
      if (useCanvasStore.getState().plugins.select.selectedIds.includes(elementId)) {
        const point = screenToCanvas(e.clientX, e.clientY);
        setDragStart(point);
      }
    }
  }, [activePlugin, screenToCanvas]);

  // Handle element mouse down for drag
  const handleElementMouseDown = useCallback((elementId: string, e: React.MouseEvent) => {
    if (activePlugin === 'select' && plugins.select.selectedIds.includes(elementId)) {
      e.stopPropagation(); // Prevent handleMouseDown from starting selection rectangle
      const point = screenToCanvas(e.clientX, e.clientY);
      setIsDragging(true);
      setDragStart(point);
    }
  }, [activePlugin, plugins.select.selectedIds, screenToCanvas]);

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

    if (isSpacePressed || activePlugin === 'pan') {
      // Pan the canvas
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
  }, [activePlugin, screenToCanvas, isSpacePressed, isSelecting, selectionStart, viewport.zoom, isDragging, dragStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
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
            const pathBounds = measurePath(pathData.points, pathData.strokeWidth, viewport.zoom);

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
              1 // Use zoom=1 to get base dimensions
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
  }, [isDragging, isSelecting, selectionStart, selectionEnd, elements]);

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
      const points = pathData.points;
      if (points.length > 0) {
        // Use precise path measurement with ghost canvas (considering stroke width)
        bounds = measurePath(points, pathData.strokeWidth, viewport.zoom);
      }
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
    const isSelected = plugins.select.selectedIds.includes(element.id);

    switch (type) {
      case 'path': {
        const pathData = data as import('../types').PathData;
        const pathString = pathData.points
          .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
          .join(' ');

        return (
          <g key={element.id}>
            <path
              d={pathString}
              stroke={pathData.strokeColor}
              strokeWidth={pathData.strokeWidth / viewport.zoom}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={pathData.opacity}
              onClick={(e) => handleElementClick(element.id, e)}
              onMouseDown={(e) => handleElementMouseDown(element.id, e)}
              style={{ 
                cursor: activePlugin === 'select' ? (isSelected ? 'move' : 'pointer') : 'default',
                filter: isSelected ? 'drop-shadow(0 0 4px rgba(0, 123, 255, 0.5))' : 'none'
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
              fontSize={textData.fontSize / viewport.zoom}
              fontFamily={textData.fontFamily}
              fontWeight={textData.fontWeight}
              fontStyle={textData.fontStyle}
              fill={textData.color}
              opacity={textData.opacity}
              style={{ 
                userSelect: 'none', 
                cursor: activePlugin === 'select' ? (isSelected ? 'move' : 'pointer') : 'default',
                filter: isSelected ? 'drop-shadow(0 0 4px rgba(0, 123, 255, 0.5))' : 'none',
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
        cursor: (isSpacePressed || activePlugin === 'pan') ? 'grabbing' : activePlugin === 'select' ? 'crosshair' : 'crosshair'
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
    </svg>
  );
};