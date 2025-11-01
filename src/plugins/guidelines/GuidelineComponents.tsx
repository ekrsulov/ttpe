import React from 'react';

interface GuidelineLineProps {
  type: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';
  position: number;
  canvasSize: { width: number; height: number };
  strokeWidth: number;
  color: string;
  dashArray?: string;
  opacity?: number;
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
  dashArray,
  opacity = 1
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
      opacity={opacity}
      pointerEvents="none"
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
  opacity?: number;
  withBackground?: boolean;
  backgroundColor?: string;
  textColor?: string;
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
  zoom,
  opacity = 1,
  withBackground = true,
  backgroundColor = 'white',
  textColor
}) => {
  const isHorizontal = axis === 'horizontal';
  const arrowSize = 5 / zoom;
  const labelOffset = 10 / zoom;
  const fontSize = 12 / zoom;
  const labelPadding = 15 / zoom;
  const labelHeight = 16 / zoom;

  // Calculate midpoint for label
  const mid = (start + end) / 2;

  return (
    <g opacity={opacity}>
      {/* Main line */}
      <line
        x1={isHorizontal ? start : otherAxisPosition}
        y1={isHorizontal ? otherAxisPosition : start}
        x2={isHorizontal ? end : otherAxisPosition}
        y2={isHorizontal ? otherAxisPosition : end}
        stroke={color}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />

      {/* Start arrow - two lines forming a V */}
      <line
        x1={isHorizontal ? start : otherAxisPosition}
        y1={isHorizontal ? otherAxisPosition : start}
        x2={isHorizontal ? start + arrowSize : otherAxisPosition - arrowSize}
        y2={isHorizontal ? otherAxisPosition - arrowSize : start + arrowSize}
        stroke={color}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />
      <line
        x1={isHorizontal ? start : otherAxisPosition}
        y1={isHorizontal ? otherAxisPosition : start}
        x2={isHorizontal ? start + arrowSize : otherAxisPosition + arrowSize}
        y2={isHorizontal ? otherAxisPosition + arrowSize : start + arrowSize}
        stroke={color}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />

      {/* End arrow - two lines forming a V */}
      <line
        x1={isHorizontal ? end : otherAxisPosition}
        y1={isHorizontal ? otherAxisPosition : end}
        x2={isHorizontal ? end - arrowSize : otherAxisPosition - arrowSize}
        y2={isHorizontal ? otherAxisPosition - arrowSize : end - arrowSize}
        stroke={color}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />
      <line
        x1={isHorizontal ? end : otherAxisPosition}
        y1={isHorizontal ? otherAxisPosition : end}
        x2={isHorizontal ? end - arrowSize : otherAxisPosition + arrowSize}
        y2={isHorizontal ? otherAxisPosition + arrowSize : end - arrowSize}
        stroke={color}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />

      {/* Distance label with optional white background */}
      <g>
        {withBackground && (
          <rect
            x={isHorizontal ? mid - labelPadding : otherAxisPosition + labelOffset / 2}
            y={isHorizontal ? otherAxisPosition - labelPadding : mid - labelHeight / 2}
            width={labelPadding * 2}
            height={labelHeight}
            fill={backgroundColor}
            rx={3 / zoom}
            ry={3 / zoom}
            pointerEvents="none"
          />
        )}
        <text
          x={isHorizontal ? mid : otherAxisPosition + labelOffset / 2 + labelPadding}
          y={isHorizontal ? otherAxisPosition - labelPadding + labelHeight / 2 + fontSize * 0.1 : mid + fontSize * 0.1}
          fill={textColor || color}
          fontSize={fontSize}
          fontFamily="sans-serif"
          textAnchor="middle"
          dominantBaseline="middle"
          pointerEvents="none"
        >
          {Math.round(distance)}
        </text>
      </g>
    </g>
  );
};
