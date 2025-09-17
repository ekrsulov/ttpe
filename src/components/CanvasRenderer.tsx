import React from 'react';
import { measurePath } from '../utils/measurementUtils';
import type { Point } from '../types';

interface CanvasRendererProps {
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  selectedIds: string[];
  plugins: {
    transformation?: {
      showCoordinates?: boolean;
      showRulers?: boolean;
    };
    shape?: {
      selectedShape?: string;
    };
  };
  elements: Array<{
    id: string;
    type: string;
    data: unknown;
    zIndex: number;
  }>;
  activePlugin: string | null;
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
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  viewport,
  selectedIds,
  plugins,
  elements,
  activePlugin,
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
}) => {
  // Render selection box for selected elements
  const renderSelectionBox = (element: typeof elements[0]) => {
    const bounds = getTransformedBounds(element);
    if (!bounds) return null;

    const isTransformationMode = activePlugin === 'transformation';
    const handlerSize = 8 / viewport.zoom;

    // Calculate contrasting selection color based on element's stroke color
    const getContrastingColor = (strokeColor: string) => {
      if (!strokeColor || strokeColor === 'none') return '#ff6b35'; // Default orange-red
      
      // Convert hex to RGB
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

      const rgb = hexToRgb(strokeColor);
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

    const elementStrokeColor = element.type === 'path' && element.data && typeof element.data === 'object' && 'strokeColor' in element.data 
      ? (element.data as { strokeColor?: string }).strokeColor || '#000000' 
      : '#000000';
    const selectionColor = getContrastingColor(elementStrokeColor);

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
        {isTransformationMode && plugins.transformation?.showCoordinates && renderCornerCoordinates(bounds)}

        {/* Measurement rulers */}
        {isTransformationMode && plugins.transformation?.showRulers && renderMeasurementRulers(bounds)}
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
        {plugins.transformation?.showCoordinates && (
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
              onPointerUp={(e) => onElementClick(element.id, e)}
              onPointerDown={(e) => onElementPointerDown(element.id, e)}
              style={{
                cursor: isSelected ? 'move' : 'pointer'
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
    const selectedShape = plugins.shape?.selectedShape || 'rectangle';
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