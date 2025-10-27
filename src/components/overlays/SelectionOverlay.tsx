import React from 'react';
import { useSelectionBounds } from '../../hooks/useSelectionBounds';
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
  // Use shared hook to compute selection bounds
  const {
    selectionColor,
    strokeWidth,
    elementRects,
    subpathRects,
    subpathSelectionColor,
  } = useSelectionBounds({
    element,
    bounds,
    viewport,
    selectedSubpaths,
    skipSubpathMeasurements: activePlugin === 'transformation',
  });

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
        color={subpathSelectionColor}
        strokeWidth={strokeWidth}
      />
    </g>
  );
};