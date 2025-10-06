import React from 'react';
import { deriveElementSelectionColors, SUBPATH_SELECTION_COLOR } from '../../utils/canvas';
import { computeAdjustedBounds, measureSelectedSubpaths } from '../../utils/overlayHelpers';

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
  selectedSubpaths?: Array<{
    elementId: string;
    subpathIndex: number;
  }>;
  activePlugin?: string | null;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  element,
  bounds,
  viewport,
  selectedSubpaths,
  activePlugin,
}) => {
  // Extract element colors and calculate selection color
  const { selectionColor } = deriveElementSelectionColors(element);
  const strokeWidth = 1 / viewport.zoom;

  // Calculate adjusted bounds for the element
  const adjustedElementBounds = bounds ? computeAdjustedBounds(bounds, viewport.zoom) : null;

  // Measure selected subpaths
  const subpathBoundsResults = selectedSubpaths && activePlugin !== 'transformation'
    ? measureSelectedSubpaths(element, selectedSubpaths, viewport.zoom)
    : [];

  return (
    <g key={`selection-${element.id}`}>
      {/* Selection rectangle for complete path */}
      {adjustedElementBounds && (() => {
        const width = adjustedElementBounds.maxX - adjustedElementBounds.minX;
        const height = adjustedElementBounds.maxY - adjustedElementBounds.minY;

        return width > 0 && height > 0 ? (
          <rect
            x={adjustedElementBounds.minX}
            y={adjustedElementBounds.minY}
            width={width}
            height={height}
            fill="none"
            stroke={selectionColor}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
        ) : null;
      })()}

      {/* Selection rectangles for subpaths */}
      {subpathBoundsResults.map((result) => {
        return result.width > 0 && result.height > 0 ? (
          <rect
            key={`subpath-${element.id}-${result.subpathIndex}`}
            x={result.bounds.minX}
            y={result.bounds.minY}
            width={result.width}
            height={result.height}
            fill="none"
            stroke={SUBPATH_SELECTION_COLOR}
            strokeWidth={strokeWidth}
            pointerEvents="none"
          />
        ) : null;
      })}
    </g>
  );
};