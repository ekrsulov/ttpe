import React from 'react';
import { deriveElementSelectionColors, SUBPATH_SELECTION_COLOR } from '../../utils/canvasColorUtils';
import { measureSubpathBounds } from '../../utils/measurementUtils';
import type { PathData } from '../../types';

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
  // Get bounds for a specific subpath
  const getIndividualSubpathBounds = (subpathIndex: number) => {
    if (element.type !== 'path') return null;

    try {
      const pathData = element.data as PathData;
      const subpaths = pathData.subPaths;

      if (subpathIndex >= subpaths.length) return null;

      const subpath = subpaths[subpathIndex];
      return measureSubpathBounds(subpath, pathData.strokeWidth || 1, viewport.zoom);
    } catch (error) {
      console.warn('Failed to calculate individual subpath bounds:', error);
      return null;
    }
  };

  // Extract element colors and calculate selection color
  const { selectionColor } = deriveElementSelectionColors(element);
  const strokeWidth = 1 / viewport.zoom;

  return (
    <g key={`selection-${element.id}`}>
      {/* Selection rectangle for complete path */}
      {bounds && (() => {
        const offset = 5 / viewport.zoom;
        const adjustedX = bounds.minX - offset;
        const adjustedY = bounds.minY - offset;
        const adjustedWidth = bounds.maxX - bounds.minX + 2 * offset;
        const adjustedHeight = bounds.maxY - bounds.minY + 2 * offset;

        return adjustedWidth > 0 && adjustedHeight > 0 ? (
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
        ) : null;
      })()}

      {/* Selection rectangles for subpaths */}
      {selectedSubpaths && activePlugin !== 'transformation' && selectedSubpaths
        .filter(sp => sp.elementId === element.id)
        .map((selected) => {
          // Get the bounds of this specific subpath
          const subpathBounds = getIndividualSubpathBounds(selected.subpathIndex);
          if (!subpathBounds) return null;

          const offset = 5 / viewport.zoom;
          const adjustedSubpathBounds = {
            minX: subpathBounds.minX - offset,
            minY: subpathBounds.minY - offset,
            maxX: subpathBounds.maxX + offset,
            maxY: subpathBounds.maxY + offset,
          };

          const adjustedX = adjustedSubpathBounds.minX;
          const adjustedY = adjustedSubpathBounds.minY;
          const adjustedWidth = adjustedSubpathBounds.maxX - adjustedSubpathBounds.minX;
          const adjustedHeight = adjustedSubpathBounds.maxY - adjustedSubpathBounds.minY;

          return adjustedWidth > 0 && adjustedHeight > 0 ? (
            <rect
              key={`subpath-${selected.elementId}-${selected.subpathIndex}`}
              x={adjustedX}
              y={adjustedY}
              width={adjustedWidth}
              height={adjustedHeight}
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