import React from 'react';
import type { AlignmentResult } from '../../utils/opticalAlignmentUtils';

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
      {/* 1. Optical center - CROSS (LARGEST, most transparent - draw first) */}
      {showOpticalCenter && (
        <g opacity={0.4}>
          {/* Horizontal line */}
          <line
            x1={metrics.opticalCenter.x - centerMarkerSize * 0.8}
            y1={metrics.opticalCenter.y}
            x2={metrics.opticalCenter.x + centerMarkerSize * 0.8}
            y2={metrics.opticalCenter.y}
            stroke="#ff6b35"
            strokeWidth={strokeWidth * 4}
            strokeLinecap="round"
          />
          {/* Vertical line */}
          <line
            x1={metrics.opticalCenter.x}
            y1={metrics.opticalCenter.y - centerMarkerSize * 0.8}
            x2={metrics.opticalCenter.x}
            y2={metrics.opticalCenter.y + centerMarkerSize * 0.8}
            stroke="#ff6b35"
            strokeWidth={strokeWidth * 4}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* 2. Mathematical center - SQUARE (MEDIUM, semi-transparent - draw second) */}
      {showMathematicalCenter && (
        <g opacity={0.6}>
          <rect
            x={metrics.mathematicalCenter.x - centerMarkerSize * 0.4}
            y={metrics.mathematicalCenter.y - centerMarkerSize * 0.4}
            width={centerMarkerSize * 0.8}
            height={centerMarkerSize * 0.8}
            fill="#6c757d"
            stroke="#fff"
            strokeWidth={strokeWidth * 2}
          />
        </g>
      )}

      {/* 3. Content optical centers - CIRCLES (SMALLEST, most opaque - draw last, on top) */}
      {showOpticalCenter && content.map((item, index) => (
        <g key={`optical-center-${index}`} opacity={0.9}>
          <circle
            cx={item.opticalCenter.x}
            cy={item.opticalCenter.y}
            r={centerMarkerSize * 0.25}
            fill="#ffc107"
            stroke="#2c2c2c"
            strokeWidth={strokeWidth * 1.5}
            opacity={0.9}
          />
        </g>
      ))}

      {/* Legend */}
      {(showMathematicalCenter || showOpticalCenter) && (
        <g transform={`translate(${container.bounds.maxX + 10 / zoom}, ${container.bounds.minY})`}>
          <rect
            x={0}
            y={0}
            width={140 / zoom}
            height={75 / zoom}
            fill="#fff"
            stroke="#dee2e6"
            strokeWidth={strokeWidth}
            opacity={0.9}
          />
          <text
            x={8 / zoom}
            y={18 / zoom}
            fontSize={13 / zoom}
            fill="#495057"
            fontFamily="Arial, sans-serif"
            fontWeight="bold"
          >
            Centers:
          </text>
          {showMathematicalCenter && (
            <g opacity={0.6}>
              {/* Square for mathematical center - fixed size */}
              <rect
                x={5 / zoom}
                y={26 / zoom}
                width={10 / zoom}
                height={10 / zoom}
                fill="#6c757d"
                stroke="#fff"
                strokeWidth={2 / zoom}
              />
              <text
                x={20 / zoom}
                y={31 / zoom}
                fontSize={11 / zoom}
                fill="#6c757d"
                fontFamily="Arial, sans-serif"
                dominantBaseline="central"
              >
                Mathematical
              </text>
            </g>
          )}
          {showOpticalCenter && (
            <g opacity={0.4}>
              {/* Cross for optical center - fixed size */}
              <line
                x1={5 / zoom}
                y1={46 / zoom}
                x2={15 / zoom}
                y2={46 / zoom}
                stroke="#ff6b35"
                strokeWidth={4 / zoom}
                strokeLinecap="round"
              />
              <line
                x1={10 / zoom}
                y1={41 / zoom}
                x2={10 / zoom}
                y2={51 / zoom}
                stroke="#ff6b35"
                strokeWidth={4 / zoom}
                strokeLinecap="round"
              />
              <text
                x={20 / zoom}
                y={46 / zoom}
                fontSize={11 / zoom}
                fill="#ff6b35"
                fontFamily="Arial, sans-serif"
                dominantBaseline="central"
              >
                Optical (Container)
              </text>
            </g>
          )}
          {showOpticalCenter && (
            <g opacity={0.9}>
              {/* Circle for content centers - fixed size */}
              <circle
                cx={10 / zoom}
                cy={62 / zoom}
                r={4 / zoom}
                fill="#ffc107"
                stroke="#2c2c2c"
                strokeWidth={1.5 / zoom}
              />
              <text
                x={20 / zoom}
                y={62 / zoom}
                fontSize={11 / zoom}
                fill="#ffc107"
                fontFamily="Arial, sans-serif"
                dominantBaseline="central"
              >
                Optical (Content)
              </text>
            </g>
          )}
        </g>
      )}
      
      {/* Distance Rules */}
      {showDistanceRules && content.length > 0 && (
        <g className="distance-rules" opacity={0.7}>
          {content.map((item, index) => {
            // Get the bounds of the content item
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
              <g key={`distance-rules-${item.elementId}-${index}`}>
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
                      stroke="#ddd"
                      strokeWidth={0.5 / zoom}
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
                      stroke="#ddd"
                      strokeWidth={0.5 / zoom}
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
                      stroke="#ddd"
                      strokeWidth={0.5 / zoom}
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
                      stroke="#ddd"
                      strokeWidth={0.5 / zoom}
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
          })}
        </g>
      )}
    </g>
  );
};