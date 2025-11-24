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

interface SelectionBboxTransformationOverlayProps {
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
  onTransformationHandlerPointerDown: (e: React.PointerEvent, targetId: string, handler: string) => void;
  onTransformationHandlerPointerUp: (e: React.PointerEvent) => void;
}

/**
 * Transformation overlay for multi-selection bbox
 * Shows transformation handlers for the entire selection
 */
export const SelectionBboxTransformationOverlay: React.FC<SelectionBboxTransformationOverlayProps> = ({
  bounds,
  viewport,
  activePlugin,
  transformation: transformationProp,
  onTransformationHandlerPointerDown: _onTransformationHandlerPointerDown,
  onTransformationHandlerPointerUp: _onTransformationHandlerPointerUp,
}) => {
  // Get transformation state from store (fallback if not in props)
  const transformationFromStore = useCanvasStore(state =>
    (state as unknown as TransformationPluginSlice).transformation
  );
  const transformation = transformationProp ?? transformationFromStore;

  // Get transformation handlers from store
  const transformationHandlers = useCanvasStore(state =>
    (state as unknown as TransformationPluginSlice).transformationHandlers
  );

  const isVirtualShiftActive = useCanvasStore(state => state.isVirtualShiftActive);

  // Create screenToCanvas function using viewport prop
  const screenToCanvas = React.useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - viewport.panX) / viewport.zoom,
      y: (screenY - viewport.panY) / viewport.zoom,
    };
  }, [viewport.panX, viewport.panY, viewport.zoom]);

  // Create wrapper functions for normal transformation
  const onNormalTransformationHandlerPointerDown = React.useCallback((e: React.PointerEvent, targetId: string, handlerType: string) => {
    if (!transformationHandlers?.startTransformation) return;
    e.stopPropagation();
    const point = screenToCanvas(e.clientX, e.clientY);
    transformationHandlers.startTransformation(targetId, handlerType, point);
  }, [transformationHandlers, screenToCanvas]);

  const onNormalTransformationHandlerPointerUp = React.useCallback((_e: React.PointerEvent) => {
    if (!transformationHandlers?.endTransformation) return;
    transformationHandlers.endTransformation();
  }, [transformationHandlers]);

  // Create wrapper functions for advanced transformation
  const onAdvancedTransformationHandlerPointerDown = React.useCallback((e: React.PointerEvent, _targetId: string, handlerType: string) => {
    if (!transformationHandlers?.startAdvancedTransformation) return;
    e.stopPropagation();
    const point = screenToCanvas(e.clientX, e.clientY);
    const isModifierPressed = e.shiftKey || isVirtualShiftActive;
    transformationHandlers.startAdvancedTransformation(handlerType, point, isModifierPressed);
  }, [transformationHandlers, screenToCanvas, isVirtualShiftActive]);

  const onAdvancedTransformationHandlerPointerUp = React.useCallback((_e: React.PointerEvent) => {
    if (!transformationHandlers?.endAdvancedTransformation) return;
    transformationHandlers.endAdvancedTransformation();
  }, [transformationHandlers]);

  // Colors that adapt to dark mode
  const coordinateBackgroundColor = useColorModeValue('#6b7280', '#4b5563');
  const coordinateTextColor = useColorModeValue('white', '#f9fafb');
  const rulerColor = useColorModeValue('#666', '#d1d5db');
  const rulerTextColor = useColorModeValue('#666', '#d1d5db');

  // Show handlers only in transformation mode (user activates this mode explicitly)
  const shouldShowHandlers = activePlugin === 'transformation';

  if (!shouldShowHandlers) return null;

  // Use amber color for multi-selection (consistent with selection bbox)
  const selectionColor = '#f59e0b'; // amber

  // Compute adjusted bounds with offset (slightly larger than groups)
  const adjustedBounds = computeAdjustedBounds(bounds, viewport.zoom, 10);
  const handlerSize = 10 / viewport.zoom;

  const centerX = (adjustedBounds.minX + adjustedBounds.maxX) / 2;
  const centerY = (adjustedBounds.minY + adjustedBounds.maxY) / 2;

  return (
    <g key="selection-bbox-transformation">
      {/* Transformation handlers for multi-selection */}
      {transformation?.advancedMode ? (
        <AdvancedTransformationOverlay
          bounds={adjustedBounds}
          elementId="selection-bbox"
          viewport={viewport}
          onPointerDown={onAdvancedTransformationHandlerPointerDown}
          onPointerUp={onAdvancedTransformationHandlerPointerUp}
          selectionColor={selectionColor}
        />
      ) : (
        <TransformationHandlers
          bounds={adjustedBounds}
          elementId="selection-bbox"
          handlerSize={handlerSize}
          selectionColor={selectionColor}
          viewport={viewport}
          onPointerDown={onNormalTransformationHandlerPointerDown}
          onPointerUp={onNormalTransformationHandlerPointerUp}
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
