import React from 'react';
import { SUBPATH_SELECTION_COLOR } from '../../utils/canvasColorUtils';
import { TransformationHandlers } from '../TransformationHandlers';
import { measureSubpathBounds } from '../../utils/measurementUtils';
import { CenterMarker, MeasurementRulers, CornerCoordinates } from './SelectionOverlayPrimitives';
import type { PathData } from '../../types';

interface SubpathSelectionOverlayProps {
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
  onTransformationHandlerPointerDown: (e: React.PointerEvent, elementId: string, handler: string) => void;
  onTransformationHandlerPointerUp: (e: React.PointerEvent) => void;
}

export const SubpathSelectionOverlay: React.FC<SubpathSelectionOverlayProps> = ({
  element,
  selectedSubpaths,
  viewport,
  activePlugin,
  transformation,
  onTransformationHandlerPointerDown,
  onTransformationHandlerPointerUp,
}) => {
  if (!selectedSubpaths || selectedSubpaths.length === 0) return null;

  const isTransformationMode = activePlugin === 'transformation';
  const handlerSize = 12 / viewport.zoom;

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

  return (
    <g key={`subpath-selection-${element.id}`}>
      {/* Render individual selection boxes and handlers for each selected subpath */}
      {selectedSubpaths.map((selected) => {
        if (selected.elementId !== element.id) return null;
        
        // Get the bounds of this specific subpath
        const subpathBounds = getIndividualSubpathBounds(selected.subpathIndex);
        if (!subpathBounds) return null;

        return (
          <g key={`subpath-${selected.elementId}-${selected.subpathIndex}`}>
            {/* Selection rectangle for this subpath */}
            {!isTransformationMode && (() => {
              const strokeWidth = 2 / viewport.zoom;
              const adjustedX = subpathBounds.minX + strokeWidth / 2;
              const adjustedY = subpathBounds.minY + strokeWidth / 2;
              const adjustedWidth = subpathBounds.maxX - subpathBounds.minX - strokeWidth;
              const adjustedHeight = subpathBounds.maxY - subpathBounds.minY - strokeWidth;
              return adjustedWidth > 0 && adjustedHeight > 0 ? (
                <rect
                  x={adjustedX}
                  y={adjustedY}
                  width={adjustedWidth}
                  height={adjustedHeight}
                  fill="none"
                  stroke={SUBPATH_SELECTION_COLOR}
                  strokeWidth={strokeWidth}
                  opacity="0.5"
                  pointerEvents="none"
                />
              ) : null;
            })()}

            {/* Individual transformation handlers for this subpath */}
            {isTransformationMode && (
              <TransformationHandlers
                bounds={subpathBounds}
                elementId={element.id}
                subpathIndex={selected.subpathIndex}
                handlerSize={handlerSize}
                selectionColor={SUBPATH_SELECTION_COLOR}
                viewport={viewport}
                onPointerDown={onTransformationHandlerPointerDown}
                onPointerUp={onTransformationHandlerPointerUp}
              />
            )}

            {/* Center X marker and coordinates for this subpath */}
            {isTransformationMode && (
              <CenterMarker 
                bounds={subpathBounds} 
                selectionColor={SUBPATH_SELECTION_COLOR} 
                viewport={viewport} 
                transformation={transformation} 
              />
            )}

            {/* Corner coordinates for this subpath */}
            {isTransformationMode && transformation?.showCoordinates && (
              <CornerCoordinates bounds={subpathBounds} viewport={viewport} />
            )}

            {/* Measurement rulers for this subpath */}
            {isTransformationMode && transformation?.showRulers && (
              <MeasurementRulers bounds={subpathBounds} viewport={viewport} />
            )}
          </g>
        );
      })}
    </g>
  );
};