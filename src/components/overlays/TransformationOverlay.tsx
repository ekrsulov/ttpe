import React from 'react';
import { getContrastingColor, getEffectiveColorForContrast, SUBPATH_SELECTION_COLOR } from '../../utils/canvasColorUtils';
import { measureSubpathBounds } from '../../utils/measurementUtils';
import { TransformationHandlers } from '../TransformationHandlers';
import type { PathData } from '../../types';

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
  if (!bounds || activePlugin !== 'transformation') return null;

  // Extract element colors for contrast calculation
  const elementStrokeColor = element.type === 'path' && element.data && typeof element.data === 'object' && 'strokeColor' in element.data
    ? (element.data as { strokeColor?: string }).strokeColor || '#000000'
    : '#000000';

  const elementFillColor = element.type === 'path' && element.data && typeof element.data === 'object' && 'fillColor' in element.data
    ? (element.data as { fillColor?: string }).fillColor || 'none'
    : 'none';

  const elementStrokeWidth = element.type === 'path' && element.data && typeof element.data === 'object' && 'strokeWidth' in element.data
    ? (element.data as { strokeWidth?: number }).strokeWidth || 0
    : 0;

  const elementOpacity = element.type === 'path' && element.data && typeof element.data === 'object' && 'strokeOpacity' in element.data
    ? (element.data as { strokeOpacity?: number }).strokeOpacity || 1
    : 1;

  const colorForContrast = getEffectiveColorForContrast(
    elementStrokeColor,
    elementFillColor,
    elementStrokeWidth,
    elementOpacity
  );

  const selectionColor = getContrastingColor(colorForContrast);

  const strokeWidth = 1 / viewport.zoom;
  const offset = 5 / viewport.zoom;
  const adjustedX = bounds.minX - offset;
  const adjustedY = bounds.minY - offset;
  const adjustedWidth = bounds.maxX - bounds.minX + 2 * offset;
  const adjustedHeight = bounds.maxY - bounds.minY + 2 * offset;
  const adjustedBounds = {
    minX: adjustedX,
    minY: adjustedY,
    maxX: adjustedX + adjustedWidth,
    maxY: adjustedY + adjustedHeight,
  };

  const handlerSize = 10 / viewport.zoom;

  return (
    <g key={`transformation-${element.id}`}>
      {/* Selection rectangle - only show when working with subpaths */}
      {isWorkingWithSubpaths && adjustedWidth > 0 && adjustedHeight > 0 && (
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

              const subpathOffset = 5 / viewport.zoom;
              const adjustedSubpathBounds = {
                minX: subpathBounds.minX - subpathOffset,
                minY: subpathBounds.minY - subpathOffset,
                maxX: subpathBounds.maxX + subpathOffset,
                maxY: subpathBounds.maxY + subpathOffset,
              };

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
                            const topLeftText = `${Math.round(adjustedSubpathBounds.minX)}, ${Math.round(adjustedSubpathBounds.minY)}`;
                            const rectWidth = topLeftText.length * fontSize * 0.6 + padding * 2;
                            const rectX = adjustedSubpathBounds.minX - coordinateOffset - padding * 6;
                            return (
                              <>
                                <rect
                                  x={rectX}
                                  y={adjustedSubpathBounds.minY - coordinateOffset - fontSize - padding}
                                  width={rectWidth}
                                  height={fontSize + padding * 2}
                                  fill="#6b7280"
                                  rx={borderRadius}
                                  ry={borderRadius}
                                  pointerEvents="none"
                                />
                                <text
                                  x={rectX + rectWidth / 2}
                                  y={adjustedSubpathBounds.minY - coordinateOffset - fontSize / 2}
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
                            const bottomRightText = `${Math.round(adjustedSubpathBounds.maxX)}, ${Math.round(adjustedSubpathBounds.maxY)}`;
                            const rectWidth = bottomRightText.length * fontSize * 0.6 + padding * 2;
                            const rectX = adjustedSubpathBounds.maxX + coordinateOffset;
                            return (
                              <>
                                <rect
                                  x={rectX}
                                  y={adjustedSubpathBounds.maxY + coordinateOffset}
                                  width={rectWidth}
                                  height={fontSize + padding * 2}
                                  fill="#6b7280"
                                  rx={borderRadius}
                                  ry={borderRadius}
                                  pointerEvents="none"
                                />
                                <text
                                  x={rectX + rectWidth / 2}
                                  y={adjustedSubpathBounds.maxY + coordinateOffset + fontSize / 2 + padding}
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
                    const width = adjustedSubpathBounds.maxX - adjustedSubpathBounds.minX;
                    const height = adjustedSubpathBounds.maxY - adjustedSubpathBounds.minY;
                    const rulerOffset = 20 / viewport.zoom; // Distance from element
                    const fontSize = 12 / viewport.zoom;

                    return (
                      <g>
                        {/* Bottom ruler (width) */}
                        <g>
                          {/* Ruler line */}
                          <line
                            x1={adjustedSubpathBounds.minX}
                            y1={adjustedSubpathBounds.maxY + rulerOffset}
                            x2={adjustedSubpathBounds.maxX}
                            y2={adjustedSubpathBounds.maxY + rulerOffset}
                            stroke="#666"
                            strokeWidth={1 / viewport.zoom}
                            pointerEvents="none"
                          />
                          {/* Left tick */}
                          <line
                            x1={adjustedSubpathBounds.minX}
                            y1={adjustedSubpathBounds.maxY + rulerOffset - 3 / viewport.zoom}
                            x2={adjustedSubpathBounds.minX}
                            y2={adjustedSubpathBounds.maxY + rulerOffset + 3 / viewport.zoom}
                            stroke="#666"
                            strokeWidth={1 / viewport.zoom}
                            pointerEvents="none"
                          />
                          {/* Right tick */}
                          <line
                            x1={adjustedSubpathBounds.maxX}
                            y1={adjustedSubpathBounds.maxY + rulerOffset - 3 / viewport.zoom}
                            x2={adjustedSubpathBounds.maxX}
                            y2={adjustedSubpathBounds.maxY + rulerOffset + 3 / viewport.zoom}
                            stroke="#666"
                            strokeWidth={1 / viewport.zoom}
                            pointerEvents="none"
                          />
                          {/* Width text */}
                          <text
                            x={adjustedSubpathBounds.minX + width / 2}
                            y={adjustedSubpathBounds.maxY + rulerOffset + 12 / viewport.zoom}
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
                            x1={adjustedSubpathBounds.maxX + rulerOffset}
                            y1={adjustedSubpathBounds.minY}
                            x2={adjustedSubpathBounds.maxX + rulerOffset}
                            y2={adjustedSubpathBounds.maxY}
                            stroke="#666"
                            strokeWidth={1 / viewport.zoom}
                            pointerEvents="none"
                          />
                          {/* Top tick */}
                          <line
                            x1={adjustedSubpathBounds.maxX + rulerOffset - 3 / viewport.zoom}
                            y1={adjustedSubpathBounds.minY}
                            x2={adjustedSubpathBounds.maxX + rulerOffset + 3 / viewport.zoom}
                            y2={adjustedSubpathBounds.minY}
                            stroke="#666"
                            strokeWidth={1 / viewport.zoom}
                            pointerEvents="none"
                          />
                          {/* Bottom tick */}
                          <line
                            x1={adjustedSubpathBounds.maxX + rulerOffset - 3 / viewport.zoom}
                            y1={adjustedSubpathBounds.maxY}
                            x2={adjustedSubpathBounds.maxX + rulerOffset + 3 / viewport.zoom}
                            y2={adjustedSubpathBounds.maxY}
                            stroke="#666"
                            strokeWidth={1 / viewport.zoom}
                            pointerEvents="none"
                          />
                          {/* Height text */}
                          <text
                            x={adjustedSubpathBounds.maxX + rulerOffset + 12 / viewport.zoom}
                            y={adjustedSubpathBounds.minY + height / 2}
                            textAnchor="middle"
                            fontSize={fontSize}
                            fill="#666"
                            pointerEvents="none"
                            transform={`rotate(90 ${adjustedSubpathBounds.maxX + rulerOffset + 12 / viewport.zoom} ${adjustedSubpathBounds.minY + height / 2})`}
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
              console.warn('Failed to calculate subpath bounds:', error);
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
                    const topLeftText = `${Math.round(adjustedBounds.minX)}, ${Math.round(adjustedBounds.minY)}`;
                    const rectWidth = topLeftText.length * fontSize * 0.6 + padding * 2;
                    const rectX = adjustedBounds.minX - coordinateOffset - padding * 6;
                    return (
                      <>
                        <rect
                          x={rectX}
                          y={adjustedBounds.minY - coordinateOffset - fontSize - padding}
                          width={rectWidth}
                          height={fontSize + padding * 2}
                          fill="#6b7280"
                          rx={borderRadius}
                          ry={borderRadius}
                          pointerEvents="none"
                        />
                        <text
                          x={rectX + rectWidth / 2}
                          y={adjustedBounds.minY - coordinateOffset - fontSize / 2}
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
                    const bottomRightText = `${Math.round(adjustedBounds.maxX)}, ${Math.round(adjustedBounds.maxY)}`;
                    const rectWidth = bottomRightText.length * fontSize * 0.6 + padding * 2;
                    const rectX = adjustedBounds.maxX + coordinateOffset;
                    return (
                      <>
                        <rect
                          x={rectX}
                          y={adjustedBounds.maxY + coordinateOffset}
                          width={rectWidth}
                          height={fontSize + padding * 2}
                          fill="#6b7280"
                          rx={borderRadius}
                          ry={borderRadius}
                          pointerEvents="none"
                        />
                        <text
                          x={rectX + rectWidth / 2}
                          y={adjustedBounds.maxY + coordinateOffset + fontSize / 2 + padding}
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
            const width = adjustedBounds.maxX - adjustedBounds.minX;
            const height = adjustedBounds.maxY - adjustedBounds.minY;
            const rulerOffset = 20 / viewport.zoom; // Distance from element
            const fontSize = 12 / viewport.zoom;

            return (
              <g>
                {/* Bottom ruler (width) */}
                <g>
                  {/* Ruler line */}
                  <line
                    x1={adjustedBounds.minX}
                    y1={adjustedBounds.maxY + rulerOffset}
                    x2={adjustedBounds.maxX}
                    y2={adjustedBounds.maxY + rulerOffset}
                    stroke="#666"
                    strokeWidth={1 / viewport.zoom}
                    pointerEvents="none"
                  />
                  {/* Left tick */}
                  <line
                    x1={adjustedBounds.minX}
                    y1={adjustedBounds.maxY + rulerOffset - 3 / viewport.zoom}
                    x2={adjustedBounds.minX}
                    y2={adjustedBounds.maxY + rulerOffset + 3 / viewport.zoom}
                    stroke="#666"
                    strokeWidth={1 / viewport.zoom}
                    pointerEvents="none"
                  />
                  {/* Right tick */}
                  <line
                    x1={adjustedBounds.maxX}
                    y1={adjustedBounds.maxY + rulerOffset - 3 / viewport.zoom}
                    x2={adjustedBounds.maxX}
                    y2={adjustedBounds.maxY + rulerOffset + 3 / viewport.zoom}
                    stroke="#666"
                    strokeWidth={1 / viewport.zoom}
                    pointerEvents="none"
                  />
                  {/* Width text */}
                  <text
                    x={adjustedBounds.minX + width / 2}
                    y={adjustedBounds.maxY + rulerOffset + 12 / viewport.zoom}
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
                    x1={adjustedBounds.maxX + rulerOffset}
                    y1={adjustedBounds.minY}
                    x2={adjustedBounds.maxX + rulerOffset}
                    y2={adjustedBounds.maxY}
                    stroke="#666"
                    strokeWidth={1 / viewport.zoom}
                    pointerEvents="none"
                  />
                  {/* Top tick */}
                  <line
                    x1={adjustedBounds.maxX + rulerOffset - 3 / viewport.zoom}
                    y1={adjustedBounds.minY}
                    x2={adjustedBounds.maxX + rulerOffset + 3 / viewport.zoom}
                    y2={adjustedBounds.minY}
                    stroke="#666"
                    strokeWidth={1 / viewport.zoom}
                    pointerEvents="none"
                  />
                  {/* Bottom tick */}
                  <line
                    x1={adjustedBounds.maxX + rulerOffset - 3 / viewport.zoom}
                    y1={adjustedBounds.maxY}
                    x2={adjustedBounds.maxX + rulerOffset + 3 / viewport.zoom}
                    y2={adjustedBounds.maxY}
                    stroke="#666"
                    strokeWidth={1 / viewport.zoom}
                    pointerEvents="none"
                  />
                  {/* Height text */}
                  <text
                    x={adjustedBounds.maxX + rulerOffset + 12 / viewport.zoom}
                    y={adjustedBounds.minY + height / 2}
                    textAnchor="middle"
                    fontSize={fontSize}
                    fill="#666"
                    pointerEvents="none"
                    transform={`rotate(90 ${adjustedBounds.maxX + rulerOffset + 12 / viewport.zoom} ${adjustedBounds.minY + height / 2})`}
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