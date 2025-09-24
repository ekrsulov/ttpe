import React from 'react';
import { getContrastingColor, getEffectiveColorForContrast } from '../../utils/canvasColorUtils';
import { TransformationHandlers } from '../TransformationHandlers';
import { CenterMarker, MeasurementRulers, CornerCoordinates } from './SelectionOverlayPrimitives';

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
  showTransformations?: boolean;
  onTransformationHandlerPointerDown: (e: React.PointerEvent, elementId: string, handler: string) => void;
  onTransformationHandlerPointerUp: (e: React.PointerEvent) => void;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  element,
  bounds,
  viewport,
  activePlugin,
  transformation,
  showTransformations = true,
  onTransformationHandlerPointerDown,
  onTransformationHandlerPointerUp,
}) => {
  if (!bounds) return null;

  const isTransformationMode = activePlugin === 'transformation';
  const handlerSize = 10 / viewport.zoom;

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

  const strokeWidth = 1 / viewport.zoom;
  const offset = 5 / viewport.zoom;
  const adjustedX = bounds.minX - offset;
  const adjustedY = bounds.minY - offset;
  const adjustedWidth = bounds.maxX - bounds.minX + 2 * offset;
  const adjustedHeight = bounds.maxY - bounds.minY + 2 * offset;
  const adjustedBounds = {
    minX: adjustedX,
    minY: adjustedY,
    maxX: adjustedX + adjustedWidth,
    maxY: adjustedY + adjustedHeight,
  };

  return (
    <g key={`selection-${element.id}`}>
      {/* Selection rectangle */}
      {adjustedWidth > 0 && adjustedHeight > 0 && (
        <rect
          x={adjustedX}
          y={adjustedY}
          width={adjustedWidth}
          height={adjustedHeight}
          fill="none"
          stroke={selectionColor}
          strokeWidth={strokeWidth}
          pointerEvents="none"
        />
      )}

      {/* Transformation handlers */}
      {isTransformationMode && showTransformations && (
        <TransformationHandlers
          bounds={adjustedBounds}
          elementId={element.id}
          handlerSize={handlerSize}
          selectionColor={selectionColor}
          viewport={viewport}
          onPointerDown={onTransformationHandlerPointerDown}
          onPointerUp={onTransformationHandlerPointerUp}
        />
      )}

      {/* Center X marker and coordinates */}
      {isTransformationMode && showTransformations && <CenterMarker bounds={adjustedBounds} selectionColor={selectionColor} viewport={viewport} transformation={transformation} />}

      {/* Corner coordinates */}
      {isTransformationMode && showTransformations && transformation?.showCoordinates && <CornerCoordinates bounds={adjustedBounds} viewport={viewport} />}

      {/* Measurement rulers */}
      {isTransformationMode && showTransformations && transformation?.showRulers && <MeasurementRulers bounds={adjustedBounds} viewport={viewport} />}
    </g>
  );
};