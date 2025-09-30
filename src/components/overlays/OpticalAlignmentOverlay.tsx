import React from 'react';
import type { AlignmentResult } from '../../utils/geometry';

interface OpticalAlignmentOverlayProps {
  alignment: AlignmentResult | null;
  showMathematicalCenter: boolean;
  showOpticalCenter: boolean;
  showDistanceRules: boolean;
  viewport: {
    zoom: number;
  };
}

export const OpticalAlignmentOverlay: React.FC<OpticalAlignmentOverlayProps> = ({
  alignment,
  showMathematicalCenter,
  showOpticalCenter,
  showDistanceRules,
  viewport
}) => {
  if (!alignment) return null;

  const { container, content, metrics } = alignment;
  const zoom = viewport.zoom;

  // Style constants
  const centerMarkerSize = 12 / zoom;
  const strokeWidth = 1.5 / zoom;

  return (
    <g className="optical-alignment-overlay">
      {/* Mathematical center - X */}
      {showMathematicalCenter && (
        <g opacity={0.6}>
          <line
            x1={metrics.mathematicalCenter.x - centerMarkerSize * 0.4}
            y1={metrics.mathematicalCenter.y - centerMarkerSize * 0.4}
            x2={metrics.mathematicalCenter.x + centerMarkerSize * 0.4}
            y2={metrics.mathematicalCenter.y + centerMarkerSize * 0.4}
            stroke="#6c757d"
            strokeWidth={strokeWidth * 2}
            strokeLinecap="round"
          />
          <line
            x1={metrics.mathematicalCenter.x + centerMarkerSize * 0.4}
            y1={metrics.mathematicalCenter.y - centerMarkerSize * 0.4}
            x2={metrics.mathematicalCenter.x - centerMarkerSize * 0.4}
            y2={metrics.mathematicalCenter.y + centerMarkerSize * 0.4}
            stroke="#6c757d"
            strokeWidth={strokeWidth * 2}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Optical center - X */}
      {showOpticalCenter && content.length > 0 && (
        <g opacity={0.9}>
          <line
            x1={content[0].opticalCenter.x - centerMarkerSize * 0.3}
            y1={content[0].opticalCenter.y - centerMarkerSize * 0.3}
            x2={content[0].opticalCenter.x + centerMarkerSize * 0.3}
            y2={content[0].opticalCenter.y + centerMarkerSize * 0.3}
            stroke="#ffc107"
            strokeWidth={strokeWidth * 2}
            strokeLinecap="round"
          />
          <line
            x1={content[0].opticalCenter.x + centerMarkerSize * 0.3}
            y1={content[0].opticalCenter.y - centerMarkerSize * 0.3}
            x2={content[0].opticalCenter.x - centerMarkerSize * 0.3}
            y2={content[0].opticalCenter.y + centerMarkerSize * 0.3}
            stroke="#ffc107"
            strokeWidth={strokeWidth * 2}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Content centroid - Red X */}
      {content.length > 0 && (
        <g opacity={0.8}>
          <line
            x1={content[0].geometry.centroid.x - centerMarkerSize * 0.35}
            y1={content[0].geometry.centroid.y - centerMarkerSize * 0.35}
            x2={content[0].geometry.centroid.x + centerMarkerSize * 0.35}
            y2={content[0].geometry.centroid.y + centerMarkerSize * 0.35}
            stroke="#dc3545"
            strokeWidth={strokeWidth * 2.5}
            strokeLinecap="round"
          />
          <line
            x1={content[0].geometry.centroid.x + centerMarkerSize * 0.35}
            y1={content[0].geometry.centroid.y - centerMarkerSize * 0.35}
            x2={content[0].geometry.centroid.x - centerMarkerSize * 0.35}
            y2={content[0].geometry.centroid.y + centerMarkerSize * 0.35}
            stroke="#dc3545"
            strokeWidth={strokeWidth * 2.5}
            strokeLinecap="round"
          />
        </g>
      )}

      {showDistanceRules && content.length > 0 && (
        <g className="distance-rules">
          {(() => {
            // Get the bounds of the content item
            const item = content[0];
            const contentBounds = {
              minX: item.geometry.bounds.minX,
              minY: item.geometry.bounds.minY,
              maxX: item.geometry.bounds.maxX,
              maxY: item.geometry.bounds.maxY
            };
            
            const containerBounds = container.bounds;
            
            // Calculate distances
            const leftDistance = Math.abs(contentBounds.minX - containerBounds.minX);
            const rightDistance = Math.abs(containerBounds.maxX - contentBounds.maxX);
            const topDistance = Math.abs(contentBounds.minY - containerBounds.minY);
            const bottomDistance = Math.abs(containerBounds.maxY - contentBounds.maxY);
            
            const textSize = 10 / zoom;
            const ruleStroke = 1 / zoom;
            
            return (
              <g key={`distance-rules-${item.elementId}`}>
                {/* Top distance */}
                {topDistance > 5 && (
                  <g>
                    {/* Vertical line */}
                    <line
                      x1={(contentBounds.minX + contentBounds.maxX) / 2}
                      y1={containerBounds.minY}
                      x2={(contentBounds.minX + contentBounds.maxX) / 2}
                      y2={contentBounds.minY}
                      stroke="#666666"
                      strokeWidth={ruleStroke}
                    />
                    {/* Distance label background */}
                    <rect
                      x={(contentBounds.minX + contentBounds.maxX) / 2 - 15 / zoom}
                      y={(containerBounds.minY + contentBounds.minY) / 2 - textSize / 2}
                      width={30 / zoom}
                      height={textSize}
                      fill="white"
                      rx={2 / zoom}
                      ry={2 / zoom}
                    />
                    {/* Distance label */}
                    <text
                      x={(contentBounds.minX + contentBounds.maxX) / 2}
                      y={(containerBounds.minY + contentBounds.minY) / 2}
                      fontSize={textSize}
                      fill="#666666"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily="Arial, sans-serif"
                    >
                      {Math.round(topDistance)}px
                    </text>
                  </g>
                )}
                
                {/* Right distance */}
                {rightDistance > 5 && (
                  <g>
                    {/* Horizontal line */}
                    <line
                      x1={contentBounds.maxX}
                      y1={(contentBounds.minY + contentBounds.maxY) / 2}
                      x2={containerBounds.maxX}
                      y2={(contentBounds.minY + contentBounds.maxY) / 2}
                      stroke="#666666"
                      strokeWidth={ruleStroke}
                    />
                    {/* Distance label background */}
                    <rect
                      x={(contentBounds.maxX + containerBounds.maxX) / 2 - 15 / zoom}
                      y={(contentBounds.minY + contentBounds.maxY) / 2 - textSize / 2}
                      width={30 / zoom}
                      height={textSize}
                      fill="white"
                      rx={2 / zoom}
                      ry={2 / zoom}
                    />
                    {/* Distance label */}
                    <text
                      x={(contentBounds.maxX + containerBounds.maxX) / 2}
                      y={(contentBounds.minY + contentBounds.maxY) / 2}
                      fontSize={textSize}
                      fill="#666666"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily="Arial, sans-serif"
                    >
                      {Math.round(rightDistance)}px
                    </text>
                  </g>
                )}
                
                {/* Bottom distance */}
                {bottomDistance > 5 && (
                  <g>
                    {/* Vertical line */}
                    <line
                      x1={(contentBounds.minX + contentBounds.maxX) / 2}
                      y1={contentBounds.maxY}
                      x2={(contentBounds.minX + contentBounds.maxX) / 2}
                      y2={containerBounds.maxY}
                      stroke="#666666"
                      strokeWidth={ruleStroke}
                    />
                    {/* Distance label background */}
                    <rect
                      x={(contentBounds.minX + contentBounds.maxX) / 2 - 15 / zoom}
                      y={(contentBounds.maxY + containerBounds.maxY) / 2 - textSize / 2}
                      width={30 / zoom}
                      height={textSize}
                      fill="white"
                      rx={2 / zoom}
                      ry={2 / zoom}
                    />
                    {/* Distance label */}
                    <text
                      x={(contentBounds.minX + contentBounds.maxX) / 2}
                      y={(contentBounds.maxY + containerBounds.maxY) / 2}
                      fontSize={textSize}
                      fill="#666666"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily="Arial, sans-serif"
                    >
                      {Math.round(bottomDistance)}px
                    </text>
                  </g>
                )}
                
                {/* Left distance */}
                {leftDistance > 5 && (
                  <g>
                    {/* Horizontal line */}
                    <line
                      x1={containerBounds.minX}
                      y1={(contentBounds.minY + contentBounds.maxY) / 2}
                      x2={contentBounds.minX}
                      y2={(contentBounds.minY + contentBounds.maxY) / 2}
                      stroke="#666666"
                      strokeWidth={ruleStroke}
                    />
                    {/* Distance label background */}
                    <rect
                      x={(containerBounds.minX + contentBounds.minX) / 2 - 15 / zoom}
                      y={(contentBounds.minY + contentBounds.maxY) / 2 - textSize / 2}
                      width={30 / zoom}
                      height={textSize}
                      fill="white"
                      rx={2 / zoom}
                      ry={2 / zoom}
                    />
                    {/* Distance label */}
                    <text
                      x={(containerBounds.minX + contentBounds.minX) / 2}
                      y={(contentBounds.minY + contentBounds.maxY) / 2}
                      fontSize={textSize}
                      fill="#666666"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily="Arial, sans-serif"
                    >
                      {Math.round(leftDistance)}px
                    </text>
                  </g>
                )}
              </g>
            );
          })()}
        </g>
      )}
    </g>
  );
};