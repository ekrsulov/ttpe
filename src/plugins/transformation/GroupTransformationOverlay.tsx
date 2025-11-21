import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import { TransformationHandlers } from './TransformationHandlers';
import { AdvancedTransformationOverlay } from './AdvancedTransformationOverlay';
import { CenterMarker } from './CenterMarker';
import { CornerCoordinateLabels } from './CornerCoordinateLabels';
import { MeasurementRulers } from './MeasurementRulers';
import { computeAdjustedBounds } from '../../utils/overlayHelpers';
import { useCanvasStore } from '../../store/canvasStore';
import type { TransformationPluginSlice } from './slice';
import type { GroupElement } from '../../types';

interface GroupTransformationOverlayProps {
  group: GroupElement;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  activePlugin: string | null;
  transformation?: {
    showCoordinates?: boolean;
    showRulers?: boolean;
    advancedMode?: boolean;
  };
  onTransformationHandlerPointerDown: (e: React.PointerEvent, groupId: string, handler: string) => void;
  onTransformationHandlerPointerUp: (e: React.PointerEvent) => void;
}

/**
 * Transformation overlay for groups - shows transformation handlers for the entire group
 */
export const GroupTransformationOverlay: React.FC<GroupTransformationOverlayProps> = ({
  group,
  bounds,
  viewport,
  activePlugin,
  transformation: transformationProp,
  onTransformationHandlerPointerDown,
  onTransformationHandlerPointerUp,
}) => {
  // Get transformation state from store (fallback if not in props)
  const transformationFromStore = useCanvasStore(state =>
    (state as unknown as TransformationPluginSlice).transformation
  );
  const transformation = transformationProp ?? transformationFromStore;

  // Colors that adapt to dark mode
  const coordinateBackgroundColor = useColorModeValue('#6b7280', '#4b5563');
  const coordinateTextColor = useColorModeValue('white', '#f9fafb');
  const rulerColor = useColorModeValue('#666', '#d1d5db');
  const rulerTextColor = useColorModeValue('#666', '#d1d5db');

  // Show handlers only in transformation mode (user activates this mode explicitly)
  const shouldShowHandlers = activePlugin === 'transformation';

  if (!shouldShowHandlers) return null;

  // Use cyan color for group selection (consistent with group selection bounds)
  const selectionColor = '#22d3ee'; // cyan

  // Compute adjusted bounds with offset (same as group selection bounds feedback visual)
  const adjustedBounds = computeAdjustedBounds(bounds, viewport.zoom, 8);
  const handlerSize = 10 / viewport.zoom;

  const centerX = (adjustedBounds.minX + adjustedBounds.maxX) / 2;
  const centerY = (adjustedBounds.minY + adjustedBounds.maxY) / 2;

  return (
    <g key={`group-transformation-${group.id}`}>
      {/* Transformation handlers for group */}
      {transformation?.advancedMode ? (
        <AdvancedTransformationOverlay
          bounds={adjustedBounds}
          elementId={`group:${group.id}`}
          viewport={viewport}
          onPointerDown={onTransformationHandlerPointerDown}
          onPointerUp={onTransformationHandlerPointerUp}
          selectionColor={selectionColor}
        />
      ) : (
        <TransformationHandlers
          bounds={adjustedBounds}
          elementId={`group:${group.id}`}
          handlerSize={handlerSize}
          selectionColor={selectionColor}
          viewport={viewport}
          onPointerDown={onTransformationHandlerPointerDown}
          onPointerUp={onTransformationHandlerPointerUp}
        />
      )}

      {/* Center marker */}
      <CenterMarker
        centerX={centerX}
        centerY={centerY}
        color={selectionColor}
        zoom={viewport.zoom}
        showCoordinates={transformation?.showCoordinates}
      />

      {/* Corner coordinates */}
      {transformation?.showCoordinates && (
        <CornerCoordinateLabels
          bounds={bounds}
          zoom={viewport.zoom}
          backgroundColor={coordinateBackgroundColor}
          textColor={coordinateTextColor}
        />
      )}

      {/* Measurement rulers */}
      {transformation?.showRulers && (
        <MeasurementRulers
          bounds={bounds}
          zoom={viewport.zoom}
          rulerColor={rulerColor}
          textColor={rulerTextColor}
        />
      )}
    </g>
  );
};
