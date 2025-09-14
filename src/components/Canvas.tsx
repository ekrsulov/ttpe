import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { Point } from '../types';

interface CanvasProps {
  width: number;
  height: number;
}

// Cache for text measurements to improve performance
const textMeasurementCache = new Map<string, { width: number; height: number }>();

// Function to clear text measurement cache (useful for memory management)
const clearTextMeasurementCache = () => {
  textMeasurementCache.clear();
};

// Function to measure text using a ghost canvas
const measureText = (
  text: string,
  fontSize: number,
  fontFamily: string,
  zoom: number,
  fontWeight: 'normal' | 'bold' = 'normal',
  fontStyle: 'normal' | 'italic' = 'normal'
): { width: number; height: number } => {
  const cacheKey = `${text}-${fontSize}-${fontFamily}-${zoom}-${fontWeight}-${fontStyle}`;

  // Check cache first
  if (textMeasurementCache.has(cacheKey)) {
    return textMeasurementCache.get(cacheKey)!;
  }

  // Create ghost canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    // Fallback to approximate calculation if canvas is not available
    const approxWidth = text.length * (fontSize / zoom) * 0.6;
    const approxHeight = fontSize / zoom;
    return { width: approxWidth, height: approxHeight };
  }

  // Set font with zoom consideration and text decorations
  const scaledFontSize = fontSize / zoom;
  ctx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}`;

  // Measure text
  const metrics = ctx.measureText(text);
  const width = metrics.width;

  // Get more precise height if available
  const actualHeight = metrics.actualBoundingBoxAscent && metrics.actualBoundingBoxDescent
    ? metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    : scaledFontSize;

  const result = { width, height: actualHeight };

  // Cache the result
  textMeasurementCache.set(cacheKey, result);

  return result;
};

export const Canvas: React.FC<CanvasProps> = ({ width, height }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { elements, viewport, activePlugin, plugins } = useCanvasStore();

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);

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
  const handleCanvasClick = useCallback(() => {
    if (activePlugin === 'select') {
      useCanvasStore.getState().clearSelection();
    }
  }, [activePlugin]);

  // Handle element click
  const handleElementClick = useCallback((elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePlugin === 'select') {
      const point = screenToCanvas(e.clientX, e.clientY);
      setDragStart(point);
      useCanvasStore.getState().selectElement(elementId, e.ctrlKey || e.metaKey);
    }
  }, [activePlugin, screenToCanvas]);

  // Handle element mouse down for drag
  const handleElementMouseDown = useCallback((elementId: string, e: React.MouseEvent) => {
    if (activePlugin === 'select' && plugins.select.selectedIds.includes(elementId)) {
      e.stopPropagation();
      const point = screenToCanvas(e.clientX, e.clientY);
      setIsDragging(true);
      setDragStart(point);
    }
  }, [activePlugin, plugins.select.selectedIds, screenToCanvas]);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const point = screenToCanvas(e.clientX, e.clientY);

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
        setIsSelecting(true);
        setSelectionStart(point);
        setSelectionEnd(point);
        break;
    }
  }, [activePlugin, screenToCanvas, isSpacePressed]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const point = screenToCanvas(e.clientX, e.clientY);

    if (isSpacePressed || activePlugin === 'pan') {
      // Pan the canvas
      const deltaX = e.movementX;
      const deltaY = e.movementY;
      useCanvasStore.getState().pan(-deltaX / viewport.zoom, -deltaY / viewport.zoom);
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

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      return;
    }

    if (isSelecting && selectionStart && selectionEnd) {
      // Calculate selection box
      const minX = Math.min(selectionStart.x, selectionEnd.x);
      const maxX = Math.max(selectionStart.x, selectionEnd.x);
      const minY = Math.min(selectionStart.y, selectionEnd.y);
      const maxY = Math.max(selectionStart.y, selectionEnd.y);

      // Find elements within the box
      const selectedIds = elements
        .filter(el => {
          if (el.type === 'path') {
            const pathData = el.data as import('../types').PathData;
            return pathData.points.some(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
          } else if (el.type === 'text') {
            const textData = el.data as import('../types').TextData;
            return textData.x >= minX && textData.x <= maxX && textData.y >= minY && textData.y <= maxY;
          }
          return false;
        })
        .map(el => el.id);

      useCanvasStore.getState().selectElements(selectedIds);
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isDragging, isSelecting, selectionStart, selectionEnd, elements]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = e.clientX - rect.left;
    const centerY = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;

    useCanvasStore.getState().zoom(factor, centerX, centerY);
  }, []);

  // Render selection box for selected elements
  const renderSelectionBox = (element: typeof elements[0]) => {
    let bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

    if (element.type === 'path') {
      const pathData = element.data as import('../types').PathData;
      const points = pathData.points;
      if (points.length > 0) {
        bounds = points.reduce(
          (acc, point) => ({
            minX: Math.min(acc.minX, point.x),
            minY: Math.min(acc.minY, point.y),
            maxX: Math.max(acc.maxX, point.x),
            maxY: Math.max(acc.maxY, point.y),
          }),
          { minX: points[0].x, minY: points[0].y, maxX: points[0].x, maxY: points[0].y }
        );
        // Add some padding
        const padding = 5 / viewport.zoom;
        bounds.minX -= padding;
        bounds.minY -= padding;
        bounds.maxX += padding;
        bounds.maxY += padding;
      }
    } else if (element.type === 'text') {
      const textData = element.data as import('../types').TextData;

      // Use precise text measurement with ghost canvas
      const { width: textWidth, height: textHeight } = measureText(
        textData.text,
        textData.fontSize,
        textData.fontFamily,
        viewport.zoom,
        textData.fontWeight,
        textData.fontStyle
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
      width={width}
      height={height}
      viewBox={`${-viewport.panX / viewport.zoom} ${-viewport.panY / viewport.zoom} ${width / viewport.zoom} ${height / viewport.zoom}`}
      style={{ border: '1px solid #ccc', cursor: (isSpacePressed || activePlugin === 'pan') ? 'grabbing' : activePlugin === 'select' ? 'crosshair' : 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
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