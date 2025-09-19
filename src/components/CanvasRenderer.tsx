import React from 'react';
import { measurePath } from '../utils/measurementUtils';
import { parsePathD, extractEditablePoints, getCommandStartPoint, updatePathD, extractSubpaths } from '../utils/pathParserUtils';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../utils';
import type { Point } from '../types';

interface CanvasRendererProps {
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  selectedIds: string[];
  selectedCommands: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
  }>;
  transformation: {
    showCoordinates?: boolean;
    showRulers?: boolean;
  };
  shape: {
    selectedShape?: string;
  };
  elements: Array<{
    id: string;
    type: string;
    data: unknown;
    zIndex: number;
  }>;
  activePlugin: string | null;
  editingPoint: { 
    elementId: string; 
    commandIndex: number; 
    pointIndex: number;
    isDragging: boolean;
    offsetX: number;
    offsetY: number;
  } | null;
  draggingSelection: {
    isDragging: boolean;
    draggedPoint: { elementId: string; commandIndex: number; pointIndex: number } | null;
    initialPositions: Array<{
      elementId: string;
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
    }>;
    startX: number;
    startY: number;
  } | null;
  subpath: {
    isDragging: boolean;
    draggedSubpath: { elementId: string; subpathIndex: number } | null;
    initialPositions: Array<{
      elementId: string;
      subpathIndex: number;
      x: number;
      y: number;
    }>;
    originalPathData: string | null;
    startX: number;
    startY: number;
  };
  isSelecting: boolean;
  selectionStart: Point | null;
  selectionEnd: Point | null;
  isCreatingShape: boolean;
  shapeStart: Point | null;
  shapeEnd: Point | null;
  onElementClick: (elementId: string, e: React.PointerEvent) => void;
  onElementPointerDown: (elementId: string, e: React.PointerEvent) => void;
  onTransformationHandlerPointerDown: (e: React.PointerEvent, elementId: string, handler: string) => void;
  onTransformationHandlerPointerUp: (e: React.PointerEvent) => void;
  onStartDraggingPoint: (elementId: string, commandIndex: number, pointIndex: number, offsetX: number, offsetY: number) => void;
  onUpdateDraggingPoint: (x: number, y: number) => void;
  onStopDraggingPoint: () => void;
  onUpdateElement: (id: string, updates: any) => void;
  onSelectCommand: (command: { elementId: string; commandIndex: number; pointIndex: number }, multiSelect?: boolean) => void;
  onStartDraggingSubpath: (elementId: string, subpathIndex: number, startX: number, startY: number, originalPathData: string) => void;
  onUpdateDraggingSubpath: (x: number, y: number) => void;
  onStopDraggingSubpath: () => void;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  viewport,
  selectedIds,
  selectedCommands,
  transformation,
  shape,
  elements,
  activePlugin,
  editingPoint,
  draggingSelection,
  subpath,
  isSelecting,
  selectionStart,
  selectionEnd,
  isCreatingShape,
  shapeStart,
  shapeEnd,
  onElementClick,
  onElementPointerDown,
  onTransformationHandlerPointerDown,
  onTransformationHandlerPointerUp,
  onStartDraggingPoint,
  onUpdateDraggingPoint,
  onStopDraggingPoint,
  onUpdateElement,
  onSelectCommand,
  onStartDraggingSubpath,
  onUpdateDraggingSubpath,
  onStopDraggingSubpath,
}) => {
  // Local state for drag visualization
  const [dragPosition, setDragPosition] = React.useState<{x: number, y: number} | null>(null);

  // Global pointer event handlers for drag
  React.useEffect(() => {
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE = 16; // ~60fps

    const handlePointerMove = (e: PointerEvent) => {
      if (editingPoint?.isDragging || draggingSelection?.isDragging || subpath?.isDragging) {
        // Get SVG element as reference for coordinate conversion
        const svgElement = document.querySelector('svg');
        if (svgElement) {
          const svgRect = svgElement.getBoundingClientRect();
          
          // Convert screen coordinates to SVG coordinates
          const svgX = e.clientX - svgRect.left;
          const svgY = e.clientY - svgRect.top;
          
          // Convert SVG coordinates to canvas coordinates (accounting for viewport)
          const canvasX = (svgX - viewport.panX) / viewport.zoom;
          const canvasY = (svgY - viewport.panY) / viewport.zoom;
          
          // Update local drag position for smooth visualization
          setDragPosition({ x: formatToPrecision(canvasX, PATH_DECIMAL_PRECISION), y: formatToPrecision(canvasY, PATH_DECIMAL_PRECISION) });
          
          if (editingPoint?.isDragging) {
            // Update store position
            onUpdateDraggingPoint(formatToPrecision(canvasX, PATH_DECIMAL_PRECISION), formatToPrecision(canvasY, PATH_DECIMAL_PRECISION));
          } else if (subpath?.isDragging) {
            // Update store position for subpath
            onUpdateDraggingSubpath(formatToPrecision(canvasX, PATH_DECIMAL_PRECISION), formatToPrecision(canvasY, PATH_DECIMAL_PRECISION));
          }

          // Throttled path update for real-time feedback
          const now = Date.now();
          if (now - lastUpdateTime >= UPDATE_THROTTLE) {
            lastUpdateTime = now;
            
            if (editingPoint?.isDragging) {
              // Update the path in real-time for single point
              const element = elements.find(el => el.id === editingPoint.elementId);
              if (element && element.type === 'path') {
                const pathData = element.data as import('../types').PathData;
                const commands = parsePathD(pathData.d);
                const points = extractEditablePoints(commands);

                const pointToUpdate = points.find(p => 
                  p.commandIndex === editingPoint.commandIndex && 
                  p.pointIndex === editingPoint.pointIndex
                );

                if (pointToUpdate) {
                  pointToUpdate.x = formatToPrecision(canvasX, PATH_DECIMAL_PRECISION);
                  pointToUpdate.y = formatToPrecision(canvasY, PATH_DECIMAL_PRECISION);

                  const newPathD = updatePathD(commands, [pointToUpdate]);
                  onUpdateElement(editingPoint.elementId, {
                    data: {
                      ...pathData,
                      d: newPathD
                    }
                  });
                }
              }
            } else if (subpath?.isDragging && subpath.draggedSubpath && subpath.originalPathData) {
              // Update the path in real-time for subpath drag
              const originalCommands = parsePathD(subpath.originalPathData);
              const subpaths = extractSubpaths(originalCommands);
              
              const draggedSubpath = subpaths[subpath.draggedSubpath!.subpathIndex];
              if (draggedSubpath) {
                // Calculate current delta from drag start to current position
                const deltaX = formatToPrecision(canvasX - subpath.startX, PATH_DECIMAL_PRECISION);
                const deltaY = formatToPrecision(canvasY - subpath.startY, PATH_DECIMAL_PRECISION);
                
                // Create a copy of the original commands to modify
                const commandsCopy = originalCommands.map(cmd => ({
                  ...cmd,
                  points: cmd.points.map(p => ({ ...p }))
                }));
                
                // Apply delta to all commands in the subpath
                const startIndex = draggedSubpath.startIndex;
                const endIndex = draggedSubpath.endIndex;
                for (let i = startIndex; i <= endIndex; i++) {
                  const cmd = commandsCopy[i];
                  cmd.points = cmd.points.map(p => ({
                    x: formatToPrecision(p.x + deltaX, PATH_DECIMAL_PRECISION),
                    y: formatToPrecision(p.y + deltaY, PATH_DECIMAL_PRECISION)
                  }));
                }
                
                // Reconstruct the path d
                const newPathD = commandsCopy.map(cmd => {
                  const pointsStr = cmd.points.map(p => `${formatToPrecision(p.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(p.y, PATH_DECIMAL_PRECISION)}`).join(' ');
                  return `${cmd.type} ${pointsStr}`;
                }).join(' ');
                
                onUpdateElement(subpath.draggedSubpath!.elementId, {
                  data: {
                    ...(elements.find(el => el.id === subpath.draggedSubpath!.elementId)?.data as import('../types').PathData),
                    d: newPathD
                  }
                });
              }
            }
          }
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (editingPoint?.isDragging || draggingSelection?.isDragging || subpath?.isDragging) {
        // Get final position for one last update if needed
        const svgElement = document.querySelector('svg');
        let finalPosition = dragPosition;
        
        if (svgElement && !finalPosition) {
          const svgRect = svgElement.getBoundingClientRect();
          const svgX = e.clientX - svgRect.left;
          const svgY = e.clientY - svgRect.top;
          finalPosition = {
            x: formatToPrecision((svgX - viewport.panX) / viewport.zoom, PATH_DECIMAL_PRECISION),
            y: formatToPrecision((svgY - viewport.panY) / viewport.zoom, PATH_DECIMAL_PRECISION)
          };
        }

        // Final update of the path with the final position (only if dragPosition was null)
        if (editingPoint?.isDragging && finalPosition && !dragPosition) {
          const element = elements.find(el => el.id === editingPoint.elementId);
          if (element && element.type === 'path') {
            const pathData = element.data as import('../types').PathData;
            const commands = parsePathD(pathData.d);
            const points = extractEditablePoints(commands);

            const pointToUpdate = points.find(p => 
              p.commandIndex === editingPoint.commandIndex && 
              p.pointIndex === editingPoint.pointIndex
            );

            if (pointToUpdate) {
              pointToUpdate.x = formatToPrecision(finalPosition.x, PATH_DECIMAL_PRECISION);
              pointToUpdate.y = formatToPrecision(finalPosition.y, PATH_DECIMAL_PRECISION);

              const newPathD = updatePathD(commands, [pointToUpdate]);
              onUpdateElement(editingPoint.elementId, {
                data: {
                  ...pathData,
                  d: newPathD
                }
              });
            }
          }
        }

        setDragPosition(null);
        if (editingPoint?.isDragging) {
          onStopDraggingPoint();
        } else if (subpath?.isDragging) {
          onStopDraggingSubpath();
        }
      }
    };

    if (editingPoint?.isDragging || draggingSelection?.isDragging || subpath?.isDragging) {
      const svgElement = document.querySelector('svg');
      if (svgElement) {
        svgElement.addEventListener('pointermove', handlePointerMove);
        svgElement.addEventListener('pointerup', handlePointerUp);
      }
    }

    return () => {
      const svgElement = document.querySelector('svg');
      if (svgElement) {
        svgElement.removeEventListener('pointermove', handlePointerMove);
        svgElement.removeEventListener('pointerup', handlePointerUp);
      }
    };
  }, [editingPoint?.isDragging, editingPoint?.elementId, editingPoint?.commandIndex, editingPoint?.pointIndex, draggingSelection?.isDragging, subpath?.isDragging, viewport, onUpdateDraggingPoint, onStopDraggingPoint, onUpdateDraggingSubpath, onStopDraggingSubpath, dragPosition, elements, onUpdateElement]);

  // Calculate contrasting selection color based on element's color (stroke or fill)
  const getContrastingColor = (color: string) => {
    if (!color || color === 'none') return '#ff6b35'; // Default orange-red for transparent/no-color elements    // Convert hex to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    // Calculate relative luminance
    const getLuminance = (r: number, g: number, b: number) => {
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const rgb = hexToRgb(color);
    if (!rgb) return '#ff6b35'; // Fallback if not a valid hex color

    const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
    const isDark = luminance < 0.5;

    // High contrast color palette based on luminance
    if (isDark) {
      // For dark colors, use bright contrasting colors
      const brightColors = [
        '#ff6b35', // Orange-red
        '#f7931e', // Orange
        '#00ff88', // Bright green
        '#00d4ff', // Bright cyan
        '#ff44ff', // Magenta
        '#ffff00', // Yellow
        '#ff4444', // Red
      ];
      
      // Select color based on hue to ensure good contrast
      const hue = Math.atan2(Math.sqrt(3) * (rgb.g - rgb.b), 2 * rgb.r - rgb.g - rgb.b) * 180 / Math.PI;
      const colorIndex = Math.floor((hue + 180) / (360 / brightColors.length)) % brightColors.length;
      return brightColors[colorIndex];
    } else {
      // For light colors, use dark contrasting colors
      const darkColors = [
        '#8b0000', // Dark red
        '#006400', // Dark green
        '#00008b', // Dark blue
        '#8b008b', // Dark magenta
        '#8b4513', // Saddle brown
        '#2f4f4f', // Dark slate gray
        '#000000', // Black
      ];
      
      // Select color based on saturation and value
      const max = Math.max(rgb.r, rgb.g, rgb.b);
      const min = Math.min(rgb.r, rgb.g, rgb.b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      
      if (saturation < 0.3) {
        return '#8b0000'; // Dark red for desaturated colors
      } else {
        const colorIndex = Math.floor((rgb.r * 2 + rgb.g + rgb.b) / (255 * 4) * darkColors.length) % darkColors.length;
        return darkColors[colorIndex];
      }
    }
  };

  // Render selection box for selected elements
  const renderSelectionBox = (element: typeof elements[0]) => {
    const bounds = getTransformedBounds(element);
    if (!bounds) return null;

    const isTransformationMode = activePlugin === 'transformation';
    const handlerSize = 12 / viewport.zoom;

    const elementStrokeColor = element.type === 'path' && element.data && typeof element.data === 'object' && 'strokeColor' in element.data 
      ? (element.data as { strokeColor?: string }).strokeColor || '#000000' 
      : '#000000';
    
    const elementFillColor = element.type === 'path' && element.data && typeof element.data === 'object' && 'fillColor' in element.data 
      ? (element.data as { fillColor?: string }).fillColor || 'none' 
      : 'none';
    
    const elementStrokeWidth = element.type === 'path' && element.data && typeof element.data === 'object' && 'strokeWidth' in element.data 
      ? (element.data as { strokeWidth?: number }).strokeWidth || 0 
      : 0;
    
    const elementOpacity = element.type === 'path' && element.data && typeof element.data === 'object' && 'strokeOpacity' in element.data 
      ? (element.data as { strokeOpacity?: number }).strokeOpacity || 1 
      : 1;
    
    // Determine if the path has an effective stroke
    // If not, use fillColor for selection color calculation instead of strokeColor
    const hasEffectiveStroke = elementStrokeWidth > 0 && elementStrokeColor !== 'none' && elementOpacity > 0;
    
    // Use fillColor for contrasting color calculation if no effective stroke
    const colorForContrast = hasEffectiveStroke ? elementStrokeColor : elementFillColor;
    
    const selectionColor = getContrastingColor(colorForContrast);

    return (
      <g key={`selection-${element.id}`}>
        {/* Selection rectangle */}
        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.maxX - bounds.minX}
          height={bounds.maxY - bounds.minY}
          fill="none"
          stroke={selectionColor}
          strokeWidth={3 / viewport.zoom}
          strokeDasharray={`${6 / viewport.zoom} ${4 / viewport.zoom}`}
          pointerEvents="none"
        />

        {/* Transformation handlers */}
        {isTransformationMode && renderTransformationHandlers(bounds, element.id, handlerSize, selectionColor)}

        {/* Center X marker and coordinates */}
        {isTransformationMode && renderCenterMarker(bounds, selectionColor)}

        {/* Corner coordinates */}
        {isTransformationMode && transformation?.showCoordinates && renderCornerCoordinates(bounds)}

        {/* Measurement rulers */}
        {isTransformationMode && transformation?.showRulers && renderMeasurementRulers(bounds)}
      </g>
    );
  };

  const renderTransformationHandlers = (bounds: { minX: number; minY: number; maxX: number; maxY: number }, elementId: string, handlerSize: number, selectionColor: string) => (
    <>
      {/* Corner handlers */}
      <rect
        x={bounds.minX - handlerSize / 2}
        y={bounds.minY - handlerSize / 2}
        width={handlerSize}
        height={handlerSize}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 'nw-resize' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'corner-tl')}
        onPointerUp={onTransformationHandlerPointerUp}
      />
      <rect
        x={bounds.maxX - handlerSize / 2}
        y={bounds.minY - handlerSize / 2}
        width={handlerSize}
        height={handlerSize}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 'ne-resize' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'corner-tr')}
        onPointerUp={onTransformationHandlerPointerUp}
      />
      <rect
        x={bounds.minX - handlerSize / 2}
        y={bounds.maxY - handlerSize / 2}
        width={handlerSize}
        height={handlerSize}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 'sw-resize' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'corner-bl')}
        onPointerUp={onTransformationHandlerPointerUp}
      />
      <rect
        x={bounds.maxX - handlerSize / 2}
        y={bounds.maxY - handlerSize / 2}
        width={handlerSize}
        height={handlerSize}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 'se-resize' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'corner-br')}
        onPointerUp={onTransformationHandlerPointerUp}
      />

      {/* Rotation handlers */}
      <circle
        cx={bounds.minX - handlerSize}
        cy={bounds.minY - handlerSize}
        r={handlerSize / 2}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 'alias' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'rotate-tl')}
        onPointerUp={onTransformationHandlerPointerUp}
      />
      <circle
        cx={bounds.maxX + handlerSize}
        cy={bounds.minY - handlerSize}
        r={handlerSize / 2}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 'alias' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'rotate-tr')}
        onPointerUp={onTransformationHandlerPointerUp}
      />
      <circle
        cx={bounds.minX - handlerSize}
        cy={bounds.maxY + handlerSize}
        r={handlerSize / 2}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 'alias' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'rotate-bl')}
        onPointerUp={onTransformationHandlerPointerUp}
      />
      <circle
        cx={bounds.maxX + handlerSize}
        cy={bounds.maxY + handlerSize}
        r={handlerSize / 2}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 'alias' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'rotate-br')}
        onPointerUp={onTransformationHandlerPointerUp}
      />

      {/* Midpoint handlers */}
      {/* Top */}
      <rect
        x={bounds.minX + (bounds.maxX - bounds.minX) / 2 - handlerSize / 2}
        y={bounds.minY - handlerSize / 2}
        width={handlerSize}
        height={handlerSize}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 'n-resize' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'midpoint-t')}
        onPointerUp={onTransformationHandlerPointerUp}
      />

      {/* Right */}
      <rect
        x={bounds.maxX - handlerSize / 2}
        y={bounds.minY + (bounds.maxY - bounds.minY) / 2 - handlerSize / 2}
        width={handlerSize}
        height={handlerSize}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 'e-resize' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'midpoint-r')}
        onPointerUp={onTransformationHandlerPointerUp}
      />

      {/* Bottom */}
      <rect
        x={bounds.minX + (bounds.maxX - bounds.minX) / 2 - handlerSize / 2}
        y={bounds.maxY - handlerSize / 2}
        width={handlerSize}
        height={handlerSize}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 's-resize' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'midpoint-b')}
        onPointerUp={onTransformationHandlerPointerUp}
      />

      {/* Left */}
      <rect
        x={bounds.minX - handlerSize / 2}
        y={bounds.minY + (bounds.maxY - bounds.minY) / 2 - handlerSize / 2}
        width={handlerSize}
        height={handlerSize}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        style={{ cursor: 'w-resize' }}
        onPointerDown={(e) => onTransformationHandlerPointerDown(e, elementId, 'midpoint-l')}
        onPointerUp={onTransformationHandlerPointerUp}
      />
    </>
  );

  const renderMeasurementRulers = (bounds: { minX: number; minY: number; maxX: number; maxY: number }) => {
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
  };

  const renderCornerCoordinates = (bounds: { minX: number; minY: number; maxX: number; maxY: number }) => {
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
  };

  const renderCenterMarker = (bounds: { minX: number; minY: number; maxX: number; maxY: number }, selectionColor: string) => {
    const centerX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
    const centerY = bounds.minY + (bounds.maxY - bounds.minY) / 2;
    const xSize = 8 / viewport.zoom; // Size of the X
    const fontSize = 10 / viewport.zoom;
    const padding = 4 / viewport.zoom;
    const borderRadius = 6 / viewport.zoom;
    const centerOffset = 15 / viewport.zoom; // Distance below the X marker
    const centerText = `${Math.round(centerX)}, ${Math.round(centerY)}`;
    const textWidth = centerText.length * fontSize * 0.6;

    return (
      <g>
        {/* X lines */}
        <line
          x1={centerX - xSize / 2}
          y1={centerY - xSize / 2}
          x2={centerX + xSize / 2}
          y2={centerY + xSize / 2}
          stroke={selectionColor}
          strokeWidth={2 / viewport.zoom}
          pointerEvents="none"
        />
        <line
          x1={centerX - xSize / 2}
          y1={centerY + xSize / 2}
          x2={centerX + xSize / 2}
          y2={centerY - xSize / 2}
          stroke={selectionColor}
          strokeWidth={2 / viewport.zoom}
          pointerEvents="none"
        />

        {/* Center coordinates */}
        {transformation?.showCoordinates && (
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
        )}
      </g>
    );
  };

  // Helper function to get transformed bounds
  const getTransformedBounds = (element: typeof elements[0]) => {
    if (element.type === 'path') {
      const pathData = element.data as import('../types').PathData;
      return measurePath(pathData.d, pathData.strokeWidth, viewport.zoom);
    }
    return null;
  };

  // Render edit points for path editing
  const renderEditPoints = (element: typeof elements[0]) => {
    if (element.type !== 'path') return null;
    const pathData = element.data as import('../types').PathData;
    const commands = parsePathD(pathData.d);
    const points = extractEditablePoints(commands);

    return (
      <g>
        {points.map((point, index) => {
          // Use drag position if available, otherwise use original position
          let displayX = point.x;
          let displayY = point.y;

          if (draggingSelection?.isDragging && draggingSelection.draggedPoint) {
            // Handle group drag visualization
            const draggedPoint = draggingSelection.draggedPoint;
            const initialPos = draggingSelection.initialPositions.find(p => 
              p.elementId === element.id &&
              p.commandIndex === point.commandIndex && 
              p.pointIndex === point.pointIndex
            );
            
            if (initialPos && dragPosition) {
              // Calculate delta from the dragged point
              const draggedInitialPos = draggingSelection.initialPositions.find(p => 
                p.elementId === draggedPoint.elementId &&
                p.commandIndex === draggedPoint.commandIndex && 
                p.pointIndex === draggedPoint.pointIndex
              );
              
              if (draggedInitialPos) {
                const deltaX = dragPosition.x - draggedInitialPos.x;
                const deltaY = dragPosition.y - draggedInitialPos.y;
                
                displayX = initialPos.x + deltaX;
                displayY = initialPos.y + deltaY;
              }
            }
          } else if (editingPoint?.isDragging && 
              editingPoint.elementId === element.id &&
              editingPoint.commandIndex === point.commandIndex && 
              editingPoint.pointIndex === point.pointIndex) {
            // Use drag position for smooth visual feedback during single drag
            if (dragPosition) {
              displayX = dragPosition.x;
              displayY = dragPosition.y;
            }
          }

          let color = 'black';
          let size = 4;
          let strokeColor = 'white';
          let strokeWidth = 1;

          // Check if this point is selected
          const isSelected = selectedCommands.some(
            cmd => cmd.elementId === element.id && 
                   cmd.commandIndex === point.commandIndex && 
                   cmd.pointIndex === point.pointIndex
          );

          if (isSelected) {
            strokeColor = 'yellow';
            strokeWidth = 2;
          }

          if (point.isControl) {
            color = 'blue'; // control points in blue
            size = 3;
          } else {
            // command points
            const cmd = commands[point.commandIndex];
            const isLastCommand = point.commandIndex === commands.length - 1;
            const isLastPointInCommand = point.pointIndex === cmd.points.length - 1;
            const isLastPointInPath = isLastCommand && isLastPointInCommand && cmd.type !== 'Z';
            
            if (cmd.type === 'M') {
              color = 'green';
              size = 6; // larger
            } else if (isLastPointInPath) {
              color = 'red';
              size = 3; // smaller
            } else {
              color = 'blue'; // intermediate command points in blue
              size = 4;
            }
          }

          return (
            <circle
              key={index}
              cx={displayX}
              cy={displayY}
              r={size / viewport.zoom}
              fill={color}
              stroke={strokeColor}
              strokeWidth={strokeWidth / viewport.zoom}
              vectorEffect="non-scaling-stroke"
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                
                // Check if this point is already selected
                const isAlreadySelected = selectedCommands.some(cmd => 
                  cmd.elementId === element.id &&
                  cmd.commandIndex === point.commandIndex &&
                  cmd.pointIndex === point.pointIndex
                );
                
                // Handle selection logic
                if (e.shiftKey) {
                  // Shift+click: toggle selection (add/remove from selection)
                  onSelectCommand({
                    elementId: element.id,
                    commandIndex: point.commandIndex,
                    pointIndex: point.pointIndex
                  }, true);
                } else if (!isAlreadySelected) {
                  // Normal click on unselected point: select it (clear others)
                  onSelectCommand({
                    elementId: element.id,
                    commandIndex: point.commandIndex,
                    pointIndex: point.pointIndex
                  }, false);
                }
                // If point is already selected and no shift, keep it selected (no action needed)
                
                // Only start dragging if not using shift (to avoid accidental drags during selection)
                if (!e.shiftKey) {
                  // Get mouse coordinates relative to SVG
                  const svgElement = e.currentTarget.ownerSVGElement;
                  if (svgElement) {
                    const svgRect = svgElement.getBoundingClientRect();
                    const svgX = e.clientX - svgRect.left;
                    const svgY = e.clientY - svgRect.top;
                    
                    // Convert to canvas coordinates
                    const canvasX = (svgX - viewport.panX) / viewport.zoom;
                    const canvasY = (svgY - viewport.panY) / viewport.zoom;
                    
                    onStartDraggingPoint(element.id, point.commandIndex, point.pointIndex, canvasX, canvasY);
                  } else {
                    // Fallback to original coordinates
                    onStartDraggingPoint(element.id, point.commandIndex, point.pointIndex, point.x, point.y);
                  }
                }
              }}
            />
          );
        })}
        {/* Render control point lines */}
        {commands.map((cmd, cmdIndex) => {
          if (cmd.type === 'C' && cmd.points.length >= 3) {
            const startPoint = getCommandStartPoint(commands, cmdIndex);
            if (startPoint) {
              let control1X = cmd.points[0].x;
              let control1Y = cmd.points[0].y;
              let control2X = cmd.points[1].x;
              let control2Y = cmd.points[1].y;
              const endX = cmd.points[2].x;
              const endY = cmd.points[2].y;

              // Update control point positions if being dragged
              if (editingPoint?.isDragging && editingPoint.elementId === element.id) {
                const dragX = dragPosition?.x ?? editingPoint.offsetX;
                const dragY = dragPosition?.y ?? editingPoint.offsetY;

                if (editingPoint.commandIndex === cmdIndex && editingPoint.pointIndex === 0) {
                  control1X = dragX;
                  control1Y = dragY;
                } else if (editingPoint.commandIndex === cmdIndex && editingPoint.pointIndex === 1) {
                  control2X = dragX;
                  control2Y = dragY;
                }
              }

              return (
                <g key={`lines-${cmdIndex}`}>
                  <line x1={startPoint.x} y1={startPoint.y} x2={control1X} y2={control1Y} stroke="blue" strokeWidth={1 / viewport.zoom} opacity={0.5} vectorEffect="non-scaling-stroke" />
                  <line x1={control2X} y1={control2Y} x2={endX} y2={endY} stroke="blue" strokeWidth={1 / viewport.zoom} opacity={0.5} vectorEffect="non-scaling-stroke" />
                </g>
              );
            }
          }
          return null;
        })}
      </g>
    );
  };

  const renderSubpathOverlays = (element: typeof elements[0]) => {
    if (element.type !== 'path') return null;
    const pathData = element.data as import('../types').PathData;
    const commands = parsePathD(pathData.d);
    const subpaths = extractSubpaths(commands);

    // Calculate contrasting colors for the overlay based on element's colors
    const elementStrokeColor = pathData.strokeColor || '#000000';
    const elementFillColor = pathData.fillColor || 'none';
    const elementStrokeWidth = pathData.strokeWidth || 0;
    const elementOpacity = pathData.strokeOpacity || 1;

    // Determine if the path has an effective stroke
    const hasEffectiveStroke = elementStrokeWidth > 0 && elementStrokeColor !== 'none' && elementOpacity > 0;
    
    // Use fillColor for contrasting color calculation if no effective stroke
    const colorForContrast = hasEffectiveStroke ? elementStrokeColor : elementFillColor;
    
    const overlayColor = getContrastingColor(colorForContrast);
    const overlayFill = `${overlayColor}01`; // 20% opacity for fill
    const overlayStroke = `${overlayColor}01`; // 50% opacity for stroke

    return (
      <g>
        {subpaths.map((subpathData, index) => {

          return (
            <path
              key={index}
              d={subpathData.d}
              fill={overlayFill}
              stroke={overlayStroke}
              strokeWidth={elementStrokeWidth}
              vectorEffect="non-scaling-stroke"
              style={{ 
                cursor: 'move',
                transform: subpath.isDragging && subpath.draggedSubpath?.elementId === element.id && subpath.draggedSubpath.subpathIndex === index && dragPosition
                  ? `translate(${dragPosition.x - subpath.startX}px, ${dragPosition.y - subpath.startY}px)`
                  : 'none'
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                const svgElement = e.currentTarget.ownerSVGElement;
                if (svgElement) {
                  const svgRect = svgElement.getBoundingClientRect();
                  const svgX = e.clientX - svgRect.left;
                  const svgY = e.clientY - svgRect.top;
                  
                  // Convert to canvas coordinates
                  const canvasX = (svgX - viewport.panX) / viewport.zoom;
                  const canvasY = (svgY - viewport.panY) / viewport.zoom;
                  
                  onStartDraggingSubpath(element.id, index, canvasX, canvasY, pathData.d);
                }
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                if (subpath.isDragging && subpath.draggedSubpath?.elementId === element.id && subpath.draggedSubpath.subpathIndex === index) {
                  onStopDraggingSubpath();
                }
              }}
            />
          );
        })}
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
        // For pencil paths, if strokeColor is 'none', render with black
        const effectiveStrokeColor = pathData.isPencilPath && pathData.strokeColor === 'none' 
          ? '#000000' 
          : pathData.strokeColor;

        return (
          <g key={element.id}>
            <path
              d={pathData.d}
              stroke={effectiveStrokeColor}
              strokeWidth={pathData.strokeWidth}
              fill={pathData.fillColor}
              fillOpacity={pathData.fillOpacity}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              opacity={pathData.strokeOpacity}
              onPointerUp={(e) => onElementClick(element.id, e)}
              onPointerDown={(e) => onElementPointerDown(element.id, e)}
              style={{
                cursor: activePlugin === 'select' ? (isSelected ? 'move' : 'pointer') : 'default',
                pointerEvents: activePlugin === 'subpath' ? 'none' : 'auto'
              }}
            />
            {isSelected && renderSelectionBox(element)}
            {isSelected && activePlugin === 'edit' && renderEditPoints(element)}
            {isSelected && activePlugin === 'subpath' && renderSubpathOverlays(element)}
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
    <>
      {sortedElements.map(renderElement)}

      {/* Selection rectangle */}
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

      {/* Shape preview */}
      {isCreatingShape && shapeStart && shapeEnd && renderShapePreview()}
    </>
  );

  function renderShapePreview() {
    const selectedShape = shape?.selectedShape || 'rectangle';
    const width = Math.abs(shapeEnd!.x - shapeStart!.x);
    const height = Math.abs(shapeEnd!.y - shapeStart!.y);
    const centerX = (shapeStart!.x + shapeEnd!.x) / 2;
    const centerY = (shapeStart!.y + shapeEnd!.y) / 2;

    let pathData = '';
    switch (selectedShape) {
      case 'square': {
        const halfSize = Math.min(width, height) / 2;
        pathData = `M ${centerX - halfSize} ${centerY - halfSize} L ${centerX + halfSize} ${centerY - halfSize} L ${centerX + halfSize} ${centerY + halfSize} L ${centerX - halfSize} ${centerY + halfSize} Z`;
        break;
      }
      case 'rectangle': {
        pathData = `M ${shapeStart!.x} ${shapeStart!.y} L ${shapeEnd!.x} ${shapeStart!.y} L ${shapeEnd!.x} ${shapeEnd!.y} L ${shapeStart!.x} ${shapeEnd!.y} Z`;
        break;
      }
      case 'circle': {
        const radius = Math.min(width, height) / 2;
        const kappa = 0.552284749831;
        pathData = `M ${centerX - radius} ${centerY} C ${centerX - radius} ${centerY - radius * kappa} ${centerX - radius * kappa} ${centerY - radius} ${centerX} ${centerY - radius} C ${centerX + radius * kappa} ${centerY - radius} ${centerX + radius} ${centerY - radius * kappa} ${centerX + radius} ${centerY} C ${centerX + radius} ${centerY + radius * kappa} ${centerX + radius * kappa} ${centerY + radius} ${centerX} ${centerY + radius} C ${centerX - radius * kappa} ${centerY + radius} ${centerX - radius} ${centerY + radius * kappa} ${centerX - radius} ${centerY} Z`;
        break;
      }
      case 'triangle': {
        pathData = `M ${centerX} ${shapeStart!.y} L ${shapeEnd!.x} ${shapeEnd!.y} L ${shapeStart!.x} ${shapeEnd!.y} Z`;
        break;
      }
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
  }
};