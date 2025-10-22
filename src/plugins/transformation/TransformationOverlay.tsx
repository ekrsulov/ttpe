import React from 'react';
import { deriveElementSelectionColors, SUBPATH_SELECTION_COLOR } from '../../utils/canvas';
import { computeAdjustedBounds, measureSelectedSubpaths } from '../../utils/overlayHelpers';
import { TransformationHandlers } from './TransformationHandlers';
import { CenterMarker } from './CenterMarker';
import { CornerCoordinateLabels } from './CornerCoordinateLabels';
import { MeasurementRulers } from './MeasurementRulers';
import { SelectionRects } from '../../components/overlays/SelectionRects';

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
  };
  isWorkingWithSubpaths: boolean;
  onTransformationHandlerPointerDown: (e: React.PointerEvent, elementId: string, handler: string) => void;
  onTransformationHandlerPointerUp: (e: React.PointerEvent) => void;
}

export const TransformationOverlay: React.FC<TransformationOverlayProps> = ({
  element,
  bounds,
  selectedSubpaths,
  viewport,
  activePlugin,
  transformation,
  isWorkingWithSubpaths,
  onTransformationHandlerPointerDown,
  onTransformationHandlerPointerUp,
}) => {
  // Show handlers for complete elements when in transformation mode
  // Show handlers for subpaths only when in transformation mode AND exactly one subpath is selected
  const shouldShowHandlers = !isWorkingWithSubpaths
    ? activePlugin === 'transformation'
    : activePlugin === 'transformation' && selectedSubpaths.length === 1;

  if (!bounds || !shouldShowHandlers) return null;

  // Extract element colors and calculate selection color
  const { selectionColor } = deriveElementSelectionColors(element);

  const strokeWidth = 1 / viewport.zoom;
  
  // Calculate adjusted bounds for the element
  const adjustedBounds = computeAdjustedBounds(bounds, viewport.zoom);
  const adjustedWidth = adjustedBounds.maxX - adjustedBounds.minX;
  const adjustedHeight = adjustedBounds.maxY - adjustedBounds.minY;

  const handlerSize = 10 / viewport.zoom;

  // Measure selected subpaths using shared helper
  const subpathBoundsResults = isWorkingWithSubpaths
    ? measureSelectedSubpaths(element, selectedSubpaths, viewport.zoom)
    : [];

  // Build selection rectangles for subpaths when not transforming exactly one
  const shouldShowSubpathSelectionRect = isWorkingWithSubpaths && 
    !(activePlugin === 'transformation' && selectedSubpaths.length === 1);
  
  const selectionRects = shouldShowSubpathSelectionRect && adjustedWidth > 0 && adjustedHeight > 0
    ? [{
        x: adjustedBounds.minX,
        y: adjustedBounds.minY,
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
        <TransformationHandlers
          bounds={adjustedBounds}
          elementId={element.id}
          handlerSize={handlerSize}
          selectionColor={selectionColor}
          viewport={viewport}
          onPointerDown={onTransformationHandlerPointerDown}
          onPointerUp={onTransformationHandlerPointerUp}
        />
      ) : (
        // For subpaths - show individual handlers for each selected subpath
        subpathBoundsResults.map((result) => (
          <g key={`subpath-handlers-${element.id}-${result.subpathIndex}`}>
            <TransformationHandlers
              bounds={result.bounds}
              elementId={element.id}
              subpathIndex={result.subpathIndex}
              handlerSize={handlerSize}
              selectionColor={SUBPATH_SELECTION_COLOR}
              viewport={viewport}
              onPointerDown={onTransformationHandlerPointerDown}
              onPointerUp={onTransformationHandlerPointerUp}
            />

            {/* Center marker for subpath */}
            <CenterMarker
              centerX={result.centerX}
              centerY={result.centerY}
              color={SUBPATH_SELECTION_COLOR}
              zoom={viewport.zoom}
              showCoordinates={transformation?.showCoordinates}
            />

            {/* Corner coordinates for subpath */}
            {transformation?.showCoordinates && (
              <CornerCoordinateLabels
                bounds={result.rawBounds}
                zoom={viewport.zoom}
              />
            )}

            {/* Measurement rulers for subpath */}
            {transformation?.showRulers && (
              <MeasurementRulers
                bounds={result.rawBounds}
                zoom={viewport.zoom}
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
            centerX={adjustedBounds.minX + (adjustedBounds.maxX - adjustedBounds.minX) / 2}
            centerY={adjustedBounds.minY + (adjustedBounds.maxY - adjustedBounds.minY) / 2}
            color={selectionColor}
            zoom={viewport.zoom}
            showCoordinates={transformation?.showCoordinates}
          />

          {/* Corner coordinates */}
          {transformation?.showCoordinates && (
            <CornerCoordinateLabels
              bounds={bounds}
              zoom={viewport.zoom}
            />
          )}

          {/* Measurement rulers */}
          {transformation?.showRulers && (
            <MeasurementRulers
              bounds={bounds}
              zoom={viewport.zoom}
            />
          )}
        </>
      )}
    </g>
  );
};