import React from 'react';
import { deriveElementSelectionColors, SUBPATH_SELECTION_COLOR } from '../../utils/canvas';
import { measureSubpathBounds } from '../../utils/geometry';
import { computeAdjustedBounds } from '../../utils/overlayHelpers';
import { TransformationHandlers } from '../TransformationHandlers';
import type { CanvasElement, PathData } from '../../types';
import { logger } from '../../utils';

interface TransformationOverlayProps {
  element: {
    id: string;
    type: string;
    data: unknown;
    zIndex: number;
    isLocked: boolean;
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
  const isLocked = (element as CanvasElement).isLocked;

  const shouldShowHandlers = !isWorkingWithSubpaths
    ? activePlugin === 'transformation' && !isLocked
    : activePlugin === 'transformation' && selectedSubpaths.length === 1 && !isLocked;

  if (!bounds || !shouldShowHandlers) return null;

  // Extract element colors and calculate selection color
  const { selectionColor } = deriveElementSelectionColors(element);

  const strokeWidth = 1 / viewport.zoom;
  
  // Calculate adjusted bounds for the element
  const adjustedBounds = computeAdjustedBounds(bounds, viewport.zoom);
  const adjustedWidth = adjustedBounds.maxX - adjustedBounds.minX;
  const adjustedHeight = adjustedBounds.maxY - adjustedBounds.minY;

  const handlerSize = 10 / viewport.zoom;

  return (
    <g key={`transformation-${element.id}`}>
      {/* Selection rectangle - only show when working with subpaths but NOT in transformation mode with exactly one subpath selected */}
      {isWorkingWithSubpaths && !(activePlugin === 'transformation' && selectedSubpaths.length === 1) && adjustedWidth > 0 && adjustedHeight > 0 && (
        <rect
          x={adjustedBounds.minX}
          y={adjustedBounds.minY}
          width={adjustedWidth}
          height={adjustedHeight}
          fill="none"
          stroke={selectionColor}
          strokeWidth={strokeWidth}
          pointerEvents="none"
        />
      )}

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
        selectedSubpaths
          .filter(sp => sp.elementId === element.id)
          .map((selected) => {
            // Get bounds for individual subpath
            if (element.type !== 'path') return null;

            try {
              const pathData = element.data as PathData;
              const subpath = pathData.subPaths[selected.subpathIndex];
              const subpathBounds = measureSubpathBounds(subpath, pathData.strokeWidth || 1, viewport.zoom);

              if (!subpathBounds) return null;

              const adjustedSubpathBounds = computeAdjustedBounds(subpathBounds, viewport.zoom);

              return (
                <g key={`subpath-handlers-${selected.elementId}-${selected.subpathIndex}`}>
                  <TransformationHandlers
                    bounds={adjustedSubpathBounds}
                    elementId={element.id}
                    subpathIndex={selected.subpathIndex}
                    handlerSize={handlerSize}
                    selectionColor={SUBPATH_SELECTION_COLOR}
                    viewport={viewport}
                    onPointerDown={onTransformationHandlerPointerDown}
                    onPointerUp={onTransformationHandlerPointerUp}
                  />

                  {/* Center marker for subpath */}
                  {(() => {
                    const centerX = subpathBounds.minX + (subpathBounds.maxX - subpathBounds.minX) / 2;
                    const centerY = subpathBounds.minY + (subpathBounds.maxY - subpathBounds.minY) / 2;
                    const xSize = 8 / viewport.zoom; // Size of the X
                    const fontSize = 10 / viewport.zoom;
                    const padding = 4 / viewport.zoom;
                    const borderRadius = 6 / viewport.zoom;
                    const centerOffset = 15 / viewport.zoom; // Distance below the X marker
                    const centerText = `${Math.round(centerX)}, ${Math.round(centerY)}`;
                    const textWidth = centerText.length * fontSize * 0.6;

                    return (
                      <g>
                        {/* X lines */}
                        <line
                          x1={centerX - xSize / 2}
                          y1={centerY - xSize / 2}
                          x2={centerX + xSize / 2}
                          y2={centerY + xSize / 2}
                          stroke={SUBPATH_SELECTION_COLOR}
                          strokeWidth={2 / viewport.zoom}
                          opacity="0.5"
                          pointerEvents="none"
                        />
                        <line
                          x1={centerX - xSize / 2}
                          y1={centerY + xSize / 2}
                          x2={centerX + xSize / 2}
                          y2={centerY - xSize / 2}
                          stroke={SUBPATH_SELECTION_COLOR}
                          strokeWidth={2 / viewport.zoom}
                          opacity="0.5"
                          pointerEvents="none"
                        />

                        {/* Center coordinates */}
                        {transformation?.showCoordinates && (
                          <g>
                            <rect
                              x={centerX - textWidth / 2 - padding}
                              y={centerY + centerOffset}
                              width={textWidth + padding * 2}
                              height={fontSize + padding * 2}
                              fill="#6b7280"
                              rx={borderRadius}
                              ry={borderRadius}
                              opacity="0.5"
                              pointerEvents="none"
                            />
                            <text
                              x={centerX}
                              y={centerY + centerOffset + fontSize / 2 + padding}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize={fontSize}
                              fill="white"
                              fontFamily="Arial, sans-serif"
                              pointerEvents="none"
                              style={{ fontWeight: 'normal', userSelect: 'none' }}
                            >
                              {centerText}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })()}

                  {/* Corner coordinates for subpath */}
                  {transformation?.showCoordinates && (() => {
                    const coordinateOffset = 15 / viewport.zoom; // Distance from corners
                    const fontSize = 10 / viewport.zoom;
                    const padding = 4 / viewport.zoom;
                    const borderRadius = 6 / viewport.zoom;

                    return (
                      <g>
                        {/* Top-left corner coordinates */}
                        <g>
                          {(() => {
                            const topLeftText = `${Math.round(subpathBounds.minX)}, ${Math.round(subpathBounds.minY)}`;
                            const rectWidth = topLeftText.length * fontSize * 0.6 + padding * 2;
                            const rectX = subpathBounds.minX - coordinateOffset - padding * 6;
                            return (
                              <>
                                <rect
                                  x={rectX}
                                  y={subpathBounds.minY - coordinateOffset - fontSize - padding}
                                  width={rectWidth}
                                  height={fontSize + padding * 2}
                                  fill="#6b7280"
                                  rx={borderRadius}
                                  ry={borderRadius}
                                  pointerEvents="none"
                                />
                                <text
                                  x={rectX + rectWidth / 2}
                                  y={subpathBounds.minY - coordinateOffset - fontSize / 2}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fontSize={fontSize}
                                  fill="white"
                                  fontFamily="Arial, sans-serif"
                                  pointerEvents="none"
                                  style={{ fontWeight: 'normal', userSelect: 'none' }}
                                >
                                  {topLeftText}
                                </text>
                              </>
                            );
                          })()}
                        </g>

                        {/* Bottom-right corner coordinates */}
                        <g>
                          {(() => {
                            const bottomRightText = `${Math.round(subpathBounds.maxX)}, ${Math.round(subpathBounds.maxY)}`;
                            const rectWidth = bottomRightText.length * fontSize * 0.6 + padding * 2;
                            const rectX = subpathBounds.maxX + coordinateOffset;
                            return (
                              <>
                                <rect
                                  x={rectX}
                                  y={subpathBounds.maxY + coordinateOffset}
                                  width={rectWidth}
                                  height={fontSize + padding * 2}
                                  fill="#6b7280"
                                  rx={borderRadius}
                                  ry={borderRadius}
                                  pointerEvents="none"
                                />
                                <text
                                  x={rectX + rectWidth / 2}
                                  y={subpathBounds.maxY + coordinateOffset + fontSize / 2 + padding}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fontSize={fontSize}
                                  fill="white"
                                  fontFamily="Arial, sans-serif"
                                  pointerEvents="none"
                                  style={{ fontWeight: 'normal', userSelect: 'none' }}
                                >
                                  {bottomRightText}
                                </text>
                              </>
                            );
                          })()}
                        </g>
                      </g>
                    );
                  })()}

                  {/* Measurement rulers for subpath */}
                  {transformation?.showRulers && (() => {
                    // Use original subpathBounds for measurements, not the adjusted bounds with offset
                    const width = subpathBounds.maxX - subpathBounds.minX;
                    const height = subpathBounds.maxY - subpathBounds.minY;
                    const rulerOffset = 20 / viewport.zoom; // Distance from element
                    const fontSize = 12 / viewport.zoom;

                    return (
                      <g>
                        {/* Bottom ruler (width) */}
                        <g>
                          {/* Ruler line */}
                          <line
                            x1={subpathBounds.minX}
                            y1={subpathBounds.maxY + rulerOffset}
                            x2={subpathBounds.maxX}
                            y2={subpathBounds.maxY + rulerOffset}
                            stroke="#666"
                            strokeWidth={1 / viewport.zoom}
                            pointerEvents="none"
                          />
                          {/* Left tick */}
                          <line
                            x1={subpathBounds.minX}
                            y1={subpathBounds.maxY + rulerOffset - 3 / viewport.zoom}
                            x2={subpathBounds.minX}
                            y2={subpathBounds.maxY + rulerOffset + 3 / viewport.zoom}
                            stroke="#666"
                            strokeWidth={1 / viewport.zoom}
                            pointerEvents="none"
                          />
                          {/* Right tick */}
                          <line
                            x1={subpathBounds.maxX}
                            y1={subpathBounds.maxY + rulerOffset - 3 / viewport.zoom}
                            x2={subpathBounds.maxX}
                            y2={subpathBounds.maxY + rulerOffset + 3 / viewport.zoom}
                            stroke="#666"
                            strokeWidth={1 / viewport.zoom}
                            pointerEvents="none"
                          />
                          {/* Width text */}
                          <text
                            x={subpathBounds.minX + width / 2}
                            y={subpathBounds.maxY + rulerOffset + 12 / viewport.zoom}
                            textAnchor="middle"
                            fontSize={fontSize}
                            fill="#666"
                            pointerEvents="none"
                            style={{ userSelect: 'none' }}
                          >
                            {Math.round(width)}px
                          </text>
                        </g>

                        {/* Right ruler (height) */}
                        <g>
                          {/* Ruler line */}
                          <line
                            x1={subpathBounds.maxX + rulerOffset}
                            y1={subpathBounds.minY}
                            x2={subpathBounds.maxX + rulerOffset}
                            y2={subpathBounds.maxY}
                            stroke="#666"
                            strokeWidth={1 / viewport.zoom}
                            pointerEvents="none"
                          />
                          {/* Top tick */}
                          <line
                            x1={subpathBounds.maxX + rulerOffset - 3 / viewport.zoom}
                            y1={subpathBounds.minY}
                            x2={subpathBounds.maxX + rulerOffset + 3 / viewport.zoom}
                            y2={subpathBounds.minY}
                            stroke="#666"
                            strokeWidth={1 / viewport.zoom}
                            pointerEvents="none"
                          />
                          {/* Bottom tick */}
                          <line
                            x1={subpathBounds.maxX + rulerOffset - 3 / viewport.zoom}
                            y1={subpathBounds.maxY}
                            x2={subpathBounds.maxX + rulerOffset + 3 / viewport.zoom}
                            y2={subpathBounds.maxY}
                            stroke="#666"
                            strokeWidth={1 / viewport.zoom}
                            pointerEvents="none"
                          />
                          {/* Height text */}
                          <text
                            x={subpathBounds.maxX + rulerOffset + 12 / viewport.zoom}
                            y={subpathBounds.minY + height / 2}
                            textAnchor="middle"
                            fontSize={fontSize}
                            fill="#666"
                            pointerEvents="none"
                            transform={`rotate(90 ${subpathBounds.maxX + rulerOffset + 12 / viewport.zoom} ${subpathBounds.minY + height / 2})`}
                            style={{ userSelect: 'none' }}
                          >
                            {Math.round(height)}px
                          </text>
                        </g>
                      </g>
                    );
                  })()}
                </g>
              );
            } catch (error) {
              logger.warn('Failed to calculate subpath bounds', error);
              return null;
            }
          })
      )}

      {/* Center marker and coordinates for complete path */}
      {!isWorkingWithSubpaths && (
        <>
          {/* Center marker */}
          {(() => {
            const centerX = adjustedBounds.minX + (adjustedBounds.maxX - adjustedBounds.minX) / 2;
            const centerY = adjustedBounds.minY + (adjustedBounds.maxY - adjustedBounds.minY) / 2;
            const xSize = 8 / viewport.zoom; // Size of the X
            const fontSize = 10 / viewport.zoom;
            const padding = 4 / viewport.zoom;
            const borderRadius = 6 / viewport.zoom;
            const centerOffset = 15 / viewport.zoom; // Distance below the X marker
            const centerText = `${Math.round(centerX)}, ${Math.round(centerY)}`;
            const textWidth = centerText.length * fontSize * 0.6;

            return (
              <g>
                {/* X lines */}
                <line
                  x1={centerX - xSize / 2}
                  y1={centerY - xSize / 2}
                  x2={centerX + xSize / 2}
                  y2={centerY + xSize / 2}
                  stroke={selectionColor}
                  strokeWidth={2 / viewport.zoom}
                  opacity="0.5"
                  pointerEvents="none"
                />
                <line
                  x1={centerX - xSize / 2}
                  y1={centerY + xSize / 2}
                  x2={centerX + xSize / 2}
                  y2={centerY - xSize / 2}
                  stroke={selectionColor}
                  strokeWidth={2 / viewport.zoom}
                  opacity="0.5"
                  pointerEvents="none"
                />

                {/* Center coordinates */}
                {transformation?.showCoordinates && (
                  <g>
                    <rect
                      x={centerX - textWidth / 2 - padding}
                      y={centerY + centerOffset}
                      width={textWidth + padding * 2}
                      height={fontSize + padding * 2}
                      fill="#6b7280"
                      rx={borderRadius}
                      ry={borderRadius}
                      opacity="0.5"
                      pointerEvents="none"
                    />
                    <text
                      x={centerX}
                      y={centerY + centerOffset + fontSize / 2 + padding}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={fontSize}
                      fill="white"
                      fontFamily="Arial, sans-serif"
                      pointerEvents="none"
                      style={{ fontWeight: 'normal', userSelect: 'none' }}
                    >
                      {centerText}
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* Corner coordinates */}
          {transformation?.showCoordinates && (() => {
            const coordinateOffset = 15 / viewport.zoom; // Distance from corners
            const fontSize = 10 / viewport.zoom;
            const padding = 4 / viewport.zoom;
            const borderRadius = 6 / viewport.zoom;

            return (
              <g>
                {/* Top-left corner coordinates */}
                <g>
                  {(() => {
                    const topLeftText = `${Math.round(bounds.minX)}, ${Math.round(bounds.minY)}`;
                    const rectWidth = topLeftText.length * fontSize * 0.6 + padding * 2;
                    const rectX = bounds.minX - coordinateOffset - padding * 6;
                    return (
                      <>
                        <rect
                          x={rectX}
                          y={bounds.minY - coordinateOffset - fontSize - padding}
                          width={rectWidth}
                          height={fontSize + padding * 2}
                          fill="#6b7280"
                          rx={borderRadius}
                          ry={borderRadius}
                          pointerEvents="none"
                        />
                        <text
                          x={rectX + rectWidth / 2}
                          y={bounds.minY - coordinateOffset - fontSize / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={fontSize}
                          fill="white"
                          fontFamily="Arial, sans-serif"
                          pointerEvents="none"
                          style={{ fontWeight: 'normal', userSelect: 'none' }}
                        >
                          {topLeftText}
                        </text>
                      </>
                    );
                  })()}
                </g>

                {/* Bottom-right corner coordinates */}
                <g>
                  {(() => {
                    const bottomRightText = `${Math.round(bounds.maxX)}, ${Math.round(bounds.maxY)}`;
                    const rectWidth = bottomRightText.length * fontSize * 0.6 + padding * 2;
                    const rectX = bounds.maxX + coordinateOffset;
                    return (
                      <>
                        <rect
                          x={rectX}
                          y={bounds.maxY + coordinateOffset}
                          width={rectWidth}
                          height={fontSize + padding * 2}
                          fill="#6b7280"
                          rx={borderRadius}
                          ry={borderRadius}
                          pointerEvents="none"
                        />
                        <text
                          x={rectX + rectWidth / 2}
                          y={bounds.maxY + coordinateOffset + fontSize / 2 + padding}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={fontSize}
                          fill="white"
                          fontFamily="Arial, sans-serif"
                          pointerEvents="none"
                          style={{ fontWeight: 'normal', userSelect: 'none' }}
                        >
                          {bottomRightText}
                        </text>
                      </>
                    );
                  })()}
                </g>
              </g>
            );
          })()}

          {/* Measurement rulers */}
          {transformation?.showRulers && (() => {
            // Use original bounds for measurements, not the adjusted bounds with offset
            const width = bounds.maxX - bounds.minX;
            const height = bounds.maxY - bounds.minY;
            const rulerOffset = 20 / viewport.zoom; // Distance from element
            const fontSize = 12 / viewport.zoom;

            return (
              <g>
                {/* Bottom ruler (width) */}
                <g>
                  {/* Ruler line */}
                  <line
                    x1={bounds.minX}
                    y1={bounds.maxY + rulerOffset}
                    x2={bounds.maxX}
                    y2={bounds.maxY + rulerOffset}
                    stroke="#666"
                    strokeWidth={1 / viewport.zoom}
                    pointerEvents="none"
                  />
                  {/* Left tick */}
                  <line
                    x1={bounds.minX}
                    y1={bounds.maxY + rulerOffset - 3 / viewport.zoom}
                    x2={bounds.minX}
                    y2={bounds.maxY + rulerOffset + 3 / viewport.zoom}
                    stroke="#666"
                    strokeWidth={1 / viewport.zoom}
                    pointerEvents="none"
                  />
                  {/* Right tick */}
                  <line
                    x1={bounds.maxX}
                    y1={bounds.maxY + rulerOffset - 3 / viewport.zoom}
                    x2={bounds.maxX}
                    y2={bounds.maxY + rulerOffset + 3 / viewport.zoom}
                    stroke="#666"
                    strokeWidth={1 / viewport.zoom}
                    pointerEvents="none"
                  />
                  {/* Width text */}
                  <text
                    x={bounds.minX + width / 2}
                    y={bounds.maxY + rulerOffset + 12 / viewport.zoom}
                    textAnchor="middle"
                    fontSize={fontSize}
                    fill="#666"
                    pointerEvents="none"
                    style={{ userSelect: 'none' }}
                  >
                    {Math.round(width)}px
                  </text>
                </g>

                {/* Right ruler (height) */}
                <g>
                  {/* Ruler line */}
                  <line
                    x1={bounds.maxX + rulerOffset}
                    y1={bounds.minY}
                    x2={bounds.maxX + rulerOffset}
                    y2={bounds.maxY}
                    stroke="#666"
                    strokeWidth={1 / viewport.zoom}
                    pointerEvents="none"
                  />
                  {/* Top tick */}
                  <line
                    x1={bounds.maxX + rulerOffset - 3 / viewport.zoom}
                    y1={bounds.minY}
                    x2={bounds.maxX + rulerOffset + 3 / viewport.zoom}
                    y2={bounds.minY}
                    stroke="#666"
                    strokeWidth={1 / viewport.zoom}
                    pointerEvents="none"
                  />
                  {/* Bottom tick */}
                  <line
                    x1={bounds.maxX + rulerOffset - 3 / viewport.zoom}
                    y1={bounds.maxY}
                    x2={bounds.maxX + rulerOffset + 3 / viewport.zoom}
                    y2={bounds.maxY}
                    stroke="#666"
                    strokeWidth={1 / viewport.zoom}
                    pointerEvents="none"
                  />
                  {/* Height text */}
                  <text
                    x={bounds.maxX + rulerOffset + 12 / viewport.zoom}
                    y={bounds.minY + height / 2}
                    textAnchor="middle"
                    fontSize={fontSize}
                    fill="#666"
                    pointerEvents="none"
                    transform={`rotate(90 ${bounds.maxX + rulerOffset + 12 / viewport.zoom} ${bounds.minY + height / 2})`}
                    style={{ userSelect: 'none' }}
                  >
                    {Math.round(height)}px
                  </text>
                </g>
              </g>
            );
          })()}
        </>
      )}
    </g>
  );
};