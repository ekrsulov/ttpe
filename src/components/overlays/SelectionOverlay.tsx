import React from 'react';
import { getContrastingColor, getEffectiveColorForContrast } from '../../utils/canvasColorUtils';
import { TransformationHandlers } from '../TransformationHandlers';

interface SelectionOverlayProps {
  element: {
    id: string;
    type: string;
    data: unknown;
    zIndex: number;
  };
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  activePlugin: string | null;
  transformation?: {
    showCoordinates?: boolean;
    showRulers?: boolean;
  };
  onTransformationHandlerPointerDown: (e: React.PointerEvent, elementId: string, handler: string) => void;
  onTransformationHandlerPointerUp: (e: React.PointerEvent) => void;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  element,
  bounds,
  viewport,
  activePlugin,
  transformation,
  onTransformationHandlerPointerDown,
  onTransformationHandlerPointerUp,
}) => {
  if (!bounds) return null;

  const isTransformationMode = activePlugin === 'transformation';
  const handlerSize = 12 / viewport.zoom;

  // Extract element colors for contrast calculation
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
  
  const colorForContrast = getEffectiveColorForContrast(
    elementStrokeColor, 
    elementFillColor, 
    elementStrokeWidth, 
    elementOpacity
  );
  
  const selectionColor = getContrastingColor(colorForContrast);

  const strokeWidth = 2 / viewport.zoom;
  const adjustedX = bounds.minX + strokeWidth / 2;
  const adjustedY = bounds.minY + strokeWidth / 2;
  const adjustedWidth = bounds.maxX - bounds.minX - strokeWidth;
  const adjustedHeight = bounds.maxY - bounds.minY - strokeWidth;

  return (
    <g key={`selection-${element.id}`}>
      {/* Selection rectangle */}
      {!isTransformationMode && adjustedWidth > 0 && adjustedHeight > 0 && (
        <rect
          x={adjustedX}
          y={adjustedY}
          width={adjustedWidth}
          height={adjustedHeight}
          fill="none"
          stroke={selectionColor}
          strokeWidth={strokeWidth}
          opacity="0.5"
          pointerEvents="none"
        />
      )}

      {/* Transformation handlers */}
      {isTransformationMode && (
        <TransformationHandlers
          bounds={bounds}
          elementId={element.id}
          handlerSize={handlerSize}
          selectionColor={selectionColor}
          viewport={viewport}
          onPointerDown={onTransformationHandlerPointerDown}
          onPointerUp={onTransformationHandlerPointerUp}
        />
      )}

      {/* Center X marker and coordinates */}
      {isTransformationMode && <CenterMarker bounds={bounds} selectionColor={selectionColor} viewport={viewport} transformation={transformation} />}

      {/* Corner coordinates */}
      {isTransformationMode && transformation?.showCoordinates && <CornerCoordinates bounds={bounds} viewport={viewport} />}

      {/* Measurement rulers */}
      {isTransformationMode && transformation?.showRulers && <MeasurementRulers bounds={bounds} viewport={viewport} />}
    </g>
  );
};

const CenterMarker: React.FC<{
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  selectionColor: string;
  viewport: { zoom: number };
  transformation?: { showCoordinates?: boolean };
}> = ({ bounds, selectionColor, viewport, transformation }) => {
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
        opacity="0.5"
        pointerEvents="none"
      />
      <line
        x1={centerX - xSize / 2}
        y1={centerY + xSize / 2}
        x2={centerX + xSize / 2}
        y2={centerY - xSize / 2}
        stroke={selectionColor}
        strokeWidth={2 / viewport.zoom}
        opacity="0.5"
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
            opacity="0.5"
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

const MeasurementRulers: React.FC<{
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  viewport: { zoom: number };
}> = ({ bounds, viewport }) => {
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
          textAnchor="middle"
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

const CornerCoordinates: React.FC<{
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  viewport: { zoom: number };
}> = ({ bounds, viewport }) => {
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