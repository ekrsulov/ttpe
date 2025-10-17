import React from 'react';
import { deriveElementSelectionColors, SUBPATH_SELECTION_COLOR } from '../../utils/canvas';
import { computeAdjustedBounds, measureSelectedSubpaths } from '../../utils/overlayHelpers';
import { SelectionRects } from './SelectionRects';

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

  // Build element rect
  const elementRects = adjustedElementBounds
    ? [{
        x: adjustedElementBounds.minX,
        y: adjustedElementBounds.minY,
        width: adjustedElementBounds.maxX - adjustedElementBounds.minX,
        height: adjustedElementBounds.maxY - adjustedElementBounds.minY,
        key: `element-${element.id}`,
      }]
    : [];

  // Build subpath rects
  const subpathRects = subpathBoundsResults.map((result) => ({
    x: result.bounds.minX,
    y: result.bounds.minY,
    width: result.width,
    height: result.height,
    key: `subpath-${element.id}-${result.subpathIndex}`,
  }));

  return (
    <g key={`selection-${element.id}`}>
      {/* Selection rectangle for complete path */}
      <SelectionRects
        rects={elementRects}
        color={selectionColor}
        strokeWidth={strokeWidth}
      />

      {/* Selection rectangles for subpaths */}
      <SelectionRects
        rects={subpathRects}
        color={SUBPATH_SELECTION_COLOR}
        strokeWidth={strokeWidth}
      />
    </g>
  );
};