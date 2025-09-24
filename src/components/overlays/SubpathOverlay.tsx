import React from 'react';
import { getContrastingColor, getEffectiveColorForContrast } from '../../utils/canvasColorUtils';
import { commandsToString } from '../../utils/pathParserUtils';
import { mapSvgToCanvas } from '../../utils/coordinateUtils';
import type { Command, PathData, SubPath } from '../../types';

interface SubpathOverlayProps {
  element: {
    id: string;
    type: string;
    data: unknown;
    zIndex: number;
  };
  selectedSubpaths: Array<{
    elementId: string;
    subpathIndex: number;
  }>;
  draggingSubpaths: {
    isDragging: boolean;
    initialPositions: Array<{
      elementId: string;
      subpathIndex: number;
      bounds: { minX: number; minY: number; maxX: number; maxY: number };
      originalCommands: Command[];
    }>;
    startX: number;
    startY: number;
    currentX?: number;
    currentY?: number;
    deltaX?: number;
    deltaY?: number;
  } | null;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  smoothBrush: {
    isActive: boolean;
  };
  onSelectSubpath: (elementId: string, subpathIndex: number, multiSelect?: boolean) => void;
  onStartDraggingSubpaths: (canvasX: number, canvasY: number) => void;
  onStopDraggingSubpaths: () => void;
}

export const SubpathOverlay: React.FC<SubpathOverlayProps> = ({
  element,
  selectedSubpaths,
  draggingSubpaths,
  viewport,
  smoothBrush,
  onSelectSubpath,
  onStartDraggingSubpaths,
  onStopDraggingSubpaths,
}) => {
  if (element.type !== 'path') return null;

  const pathData = element.data as PathData;

  // Use the current path data (which may be updated during dragging) instead of original
  const subpaths = pathData.subPaths;

  // Calculate contrasting colors for the overlay based on element's colors
  const elementStrokeColor = pathData.strokeColor || '#000000';
  const elementFillColor = pathData.fillColor || 'none';
  const elementStrokeWidth = pathData.strokeWidth || 0;
  const elementOpacity = pathData.strokeOpacity || 1;

  const colorForContrast = getEffectiveColorForContrast(
    elementStrokeColor,
    elementFillColor,
    elementStrokeWidth,
    elementOpacity
  );

  const overlayColor = getContrastingColor(colorForContrast);

  return (
    <g>
      {subpaths.map((subpathData: SubPath, index: number) => {
        // Check if this subpath is selected
        const isSubpathSelected = selectedSubpaths.some(
          s => s.elementId === element.id && s.subpathIndex === index
        );

        // Different colors for selected and unselected subpaths
        const overlayFill = isSubpathSelected ? `${overlayColor}40` : `${overlayColor}15`; // More opacity for selected
        const overlayStroke = isSubpathSelected ? `${overlayColor}80` : `${overlayColor}40`; // Stronger stroke for selected
        const strokeWidth = isSubpathSelected ? elementStrokeWidth + 1 : elementStrokeWidth;

        return (
          <path
            key={index}
            d={commandsToString(subpathData)}
            fill={overlayFill}
            stroke={overlayStroke}
            strokeWidth={strokeWidth}
            strokeLinecap={pathData.strokeLinecap || "round"}
            strokeLinejoin={pathData.strokeLinejoin || "round"}
            vectorEffect="non-scaling-stroke"
            style={{
              cursor: 'pointer'
              // Removed the transform - the overlay should follow the updated path data
            }}
            onPointerDown={(e) => {
              // Don't stop propagation - let Canvas handlePointerDown also run to set dragStart

              // Disable subpath interaction when smooth brush is active
              if (smoothBrush.isActive) {
                return;
              }

              // Check if this is a click for selection or start of drag
              if (e.shiftKey) {
                // Shift+click for multiselect
                onSelectSubpath(element.id, index, true);
              } else {
                // Regular click - check if already selected
                const isAlreadySelected = selectedSubpaths.some(
                  s => s.elementId === element.id && s.subpathIndex === index
                );

                if (!isAlreadySelected) {
                  // Select this subpath if not already selected
                  onSelectSubpath(element.id, index, false);
                }

                // Start dragging
                const svgElement = (e.currentTarget as SVGElement).ownerSVGElement;
                if (svgElement) {
                  const svgRect = svgElement.getBoundingClientRect();
                  const svgX = e.clientX - svgRect.left;
                  const svgY = e.clientY - svgRect.top;

                  // Convert to canvas coordinates
                  const canvasPoint = mapSvgToCanvas(svgX, svgY, viewport);

                  // Start dragging subpaths
                  onStartDraggingSubpaths(canvasPoint.x, canvasPoint.y);
                }
              }
            }}
            onPointerMove={() => {
              // Let Canvas handle all pointer move events for subpaths
              // The overlay just needs to ensure the drag is started correctly
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              // Ensure subpath dragging is stopped when releasing on the overlay
              if (draggingSubpaths?.isDragging) {
                onStopDraggingSubpaths();
              }
            }}
          />
        );
      })}
    </g>
  );
};