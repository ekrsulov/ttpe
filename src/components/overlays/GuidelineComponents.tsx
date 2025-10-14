import React from 'react';

interface GuidelineLineProps {
  type: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';
  position: number;
  canvasSize: { width: number; height: number };
  strokeWidth: number;
  color: string;
  dashArray?: string;
}

/**
 * Reusable guideline line component
 * Renders horizontal or vertical lines based on guideline type
 */
export const GuidelineLine: React.FC<GuidelineLineProps> = ({
  type,
  position,
  canvasSize,
  strokeWidth,
  color,
  dashArray
}) => {
  const isVertical = type === 'left' || type === 'right' || type === 'centerX';

  return (
    <line
      x1={isVertical ? position : -canvasSize.width / 2}
      y1={isVertical ? -canvasSize.height / 2 : position}
      x2={isVertical ? position : canvasSize.width * 1.5}
      y2={isVertical ? canvasSize.height * 1.5 : position}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={dashArray}
    />
  );
};

interface DistanceLabelProps {
  axis: 'horizontal' | 'vertical';
  start: number;
  end: number;
  distance: number;
  otherAxisPosition: number;
  strokeWidth: number;
  color: string;
  zoom: number;
}

/**
 * Reusable distance label component
 * Renders distance measurement with arrowheads and label
 */
export const DistanceLabel: React.FC<DistanceLabelProps> = ({
  axis,
  start,
  end,
  distance,
  otherAxisPosition,
  strokeWidth,
  color,
  zoom
}) => {
  const isHorizontal = axis === 'horizontal';
  const arrowSize = 5 / zoom;
  const labelOffset = 10 / zoom;
  const fontSize = 12 / zoom;

  // Calculate midpoint for label
  const mid = (start + end) / 2;

  return (
    <g>
      {/* Main line */}
      <line
        x1={isHorizontal ? start : otherAxisPosition}
        y1={isHorizontal ? otherAxisPosition : start}
        x2={isHorizontal ? end : otherAxisPosition}
        y2={isHorizontal ? otherAxisPosition : end}
        stroke={color}
        strokeWidth={strokeWidth}
      />

      {/* Start arrow */}
      <line
        x1={isHorizontal ? start : otherAxisPosition}
        y1={isHorizontal ? otherAxisPosition : start}
        x2={isHorizontal ? start + arrowSize : otherAxisPosition - arrowSize}
        y2={isHorizontal ? otherAxisPosition - arrowSize : start + arrowSize}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <line
        x1={isHorizontal ? start : otherAxisPosition}
        y1={isHorizontal ? otherAxisPosition : start}
        x2={isHorizontal ? start + arrowSize : otherAxisPosition + arrowSize}
        y2={isHorizontal ? otherAxisPosition + arrowSize : start + arrowSize}
        stroke={color}
        strokeWidth={strokeWidth}
      />

      {/* End arrow */}
      <line
        x1={isHorizontal ? end : otherAxisPosition}
        y1={isHorizontal ? otherAxisPosition : end}
        x2={isHorizontal ? end - arrowSize : otherAxisPosition - arrowSize}
        y2={isHorizontal ? otherAxisPosition - arrowSize : end - arrowSize}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <line
        x1={isHorizontal ? end : otherAxisPosition}
        y1={isHorizontal ? otherAxisPosition : end}
        x2={isHorizontal ? end - arrowSize : otherAxisPosition + arrowSize}
        y2={isHorizontal ? otherAxisPosition + arrowSize : end - arrowSize}
        stroke={color}
        strokeWidth={strokeWidth}
      />

      {/* Distance label */}
      <text
        x={isHorizontal ? mid : otherAxisPosition + labelOffset}
        y={isHorizontal ? otherAxisPosition - labelOffset : mid}
        fill={color}
        fontSize={fontSize}
        fontFamily="monospace"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {distance}px
      </text>
    </g>
  );
};
