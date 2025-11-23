import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import { useSelectionBounds } from '../../hooks/useSelectionBounds';
import { TransformationHandlers } from './TransformationHandlers';
import { AdvancedTransformationOverlay } from './AdvancedTransformationOverlay';
import { CenterMarker } from './CenterMarker';
import { CornerCoordinateLabels } from './CornerCoordinateLabels';
import { MeasurementRulers } from './MeasurementRulers';
import { SelectionRects } from '../../overlays/SelectionRects';
import { useCanvasStore } from '../../store/canvasStore';
import type { TransformationPluginSlice } from './slice';

interface TransformationOverlayProps {
  element: {
    id: string;
    type: string;
    data: unknown;
    zIndex: number;
  };
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  selectedSubpaths: Array<{
    elementId: string;
    subpathIndex: number;
  }>;
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
  isWorkingWithSubpaths: boolean;
}

export const TransformationOverlay: React.FC<TransformationOverlayProps> = ({
  element,
  bounds,
  selectedSubpaths,
  viewport,
  activePlugin,
  transformation: transformationProp,
  isWorkingWithSubpaths,
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
  
  // Create screenToCanvas function using viewport prop
  const screenToCanvas = React.useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - viewport.panX) / viewport.zoom,
      y: (screenY - viewport.panY) / viewport.zoom,
    };
  }, [viewport.panX, viewport.panY, viewport.zoom]);

  // Create wrapper functions that adapt the handler signatures
  const onTransformationHandlerPointerDown = React.useCallback((e: React.PointerEvent, targetId: string, handlerType: string) => {
    if (!transformationHandlers?.startTransformation) return;
    e.stopPropagation();
    const point = screenToCanvas(e.clientX, e.clientY);
    transformationHandlers.startTransformation(targetId, handlerType, point);
  }, [transformationHandlers, screenToCanvas]);

  const onTransformationHandlerPointerUp = React.useCallback((_e: React.PointerEvent) => {
    if (!transformationHandlers?.endTransformation) return;
    transformationHandlers.endTransformation();
  }, [transformationHandlers]);

  const onAdvancedTransformationHandlerPointerDown = React.useCallback((e: React.PointerEvent, _targetId: string, handlerType: string) => {
    if (!transformationHandlers?.startAdvancedTransformation) return;
    e.stopPropagation();
    const point = screenToCanvas(e.clientX, e.clientY);
    const isModifierPressed = e.metaKey || e.ctrlKey || e.altKey;
    transformationHandlers.startAdvancedTransformation(handlerType, point, isModifierPressed);
  }, [transformationHandlers, screenToCanvas]);

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
  // For subpaths: only show in transformation mode AND exactly one subpath is selected
  const shouldShowHandlers = !isWorkingWithSubpaths
    ? activePlugin === 'transformation'
    : activePlugin === 'transformation' && selectedSubpaths.length === 1;

  // Use shared hook to compute selection bounds
  const {
    selectionColor,
    strokeWidth,
    adjustedElementBounds,
    subpathBoundsResults,
    subpathSelectionColor,
  } = useSelectionBounds({
    element,
    bounds,
    viewport,
    selectedSubpaths,
    skipSubpathMeasurements: !isWorkingWithSubpaths,
  });

  if (!adjustedElementBounds || !shouldShowHandlers) return null;

  const adjustedWidth = adjustedElementBounds.maxX - adjustedElementBounds.minX;
  const adjustedHeight = adjustedElementBounds.maxY - adjustedElementBounds.minY;
  const handlerSize = 10 / viewport.zoom;

  // Build selection rectangles for subpaths when not transforming exactly one
  const shouldShowSubpathSelectionRect = isWorkingWithSubpaths && 
    !(activePlugin === 'transformation' && selectedSubpaths.length === 1);
  
  const selectionRects = shouldShowSubpathSelectionRect && adjustedWidth > 0 && adjustedHeight > 0
    ? [{
        x: adjustedElementBounds.minX,
        y: adjustedElementBounds.minY,
        width: adjustedWidth,
        height: adjustedHeight,
        key: `element-${element.id}`,
      }]
    : [];

  return (
    <g key={`transformation-${element.id}`}>
      {/* Selection rectangle - only show when working with subpaths but NOT in transformation mode with exactly one subpath selected */}
      <SelectionRects
        rects={selectionRects}
        color={selectionColor}
        strokeWidth={strokeWidth}
      />

      {/* Transformation handlers */}
      {!isWorkingWithSubpaths ? (
        // For complete paths
        transformation?.advancedMode ? (
          <AdvancedTransformationOverlay
            bounds={adjustedElementBounds}
            elementId={element.id}
            viewport={viewport}
            onPointerDown={onAdvancedTransformationHandlerPointerDown}
            onPointerUp={onAdvancedTransformationHandlerPointerUp}
            selectionColor={selectionColor}
          />
        ) : (
          <TransformationHandlers
            bounds={adjustedElementBounds}
            elementId={element.id}
            handlerSize={handlerSize}
            selectionColor={selectionColor}
            viewport={viewport}
            onPointerDown={onTransformationHandlerPointerDown}
            onPointerUp={onTransformationHandlerPointerUp}
          />
        )
      ) : (
        // For subpaths - show individual handlers for each selected subpath
        subpathBoundsResults.map((result) => (
          <g key={`subpath-handlers-${element.id}-${result.subpathIndex}`}>
            {transformation?.advancedMode ? (
              <AdvancedTransformationOverlay
                bounds={result.bounds}
                elementId={element.id}
                subpathIndex={result.subpathIndex}
                viewport={viewport}
                onPointerDown={onAdvancedTransformationHandlerPointerDown}
                onPointerUp={onAdvancedTransformationHandlerPointerUp}
                selectionColor={subpathSelectionColor}
              />
            ) : (
              <TransformationHandlers
                bounds={result.bounds}
                elementId={element.id}
                subpathIndex={result.subpathIndex}
                handlerSize={handlerSize}
                selectionColor={subpathSelectionColor}
                viewport={viewport}
                onPointerDown={onTransformationHandlerPointerDown}
                onPointerUp={onTransformationHandlerPointerUp}
              />
            )}

            {/* Center marker for subpath */}
            <CenterMarker
              centerX={result.centerX}
              centerY={result.centerY}
              color={subpathSelectionColor}
              zoom={viewport.zoom}
              showCoordinates={transformation?.showCoordinates}
            />

            {/* Corner coordinates for subpath */}
            {transformation?.showCoordinates && (
              <CornerCoordinateLabels
                bounds={result.rawBounds}
                zoom={viewport.zoom}
                backgroundColor={coordinateBackgroundColor}
                textColor={coordinateTextColor}
              />
            )}

            {/* Measurement rulers for subpath */}
            {transformation?.showRulers && (
              <MeasurementRulers
                bounds={result.rawBounds}
                zoom={viewport.zoom}
                rulerColor={rulerColor}
                textColor={rulerTextColor}
              />
            )}
          </g>
        ))
      )}

      {/* Center marker and coordinates for complete path */}
      {!isWorkingWithSubpaths && (
        <>
          {/* Center marker */}
          <CenterMarker
            centerX={adjustedElementBounds.minX + (adjustedElementBounds.maxX - adjustedElementBounds.minX) / 2}
            centerY={adjustedElementBounds.minY + (adjustedElementBounds.maxY - adjustedElementBounds.minY) / 2}
            color={selectionColor}
            zoom={viewport.zoom}
            showCoordinates={transformation?.showCoordinates}
          />

          {/* Corner coordinates */}
          {transformation?.showCoordinates && bounds && (
            <CornerCoordinateLabels
              bounds={bounds}
              zoom={viewport.zoom}
              backgroundColor={coordinateBackgroundColor}
              textColor={coordinateTextColor}
            />
          )}

          {/* Measurement rulers */}
          {transformation?.showRulers && bounds && (
            <MeasurementRulers
              bounds={bounds}
              zoom={viewport.zoom}
              rulerColor={rulerColor}
              textColor={rulerTextColor}
            />
          )}
        </>
      )}
    </g>
  );
};