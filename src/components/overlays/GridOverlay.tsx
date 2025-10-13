import React from 'react';

interface GridOverlayProps {
  grid: {
    enabled: boolean;
    spacing: number;
    showRulers: boolean;
  };
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  canvasSize: {
    width: number;
    height: number;
  };
}

export const GridOverlay: React.FC<GridOverlayProps> = React.memo(({
  grid,
  viewport,
  canvasSize,
}) => {
  if (!grid.enabled) {
    return null;
  }

  // Grid spacing in world coordinates (constant size regardless of zoom)
  const spacing = grid.spacing;

  // ViewBox coordinates: The viewBox starts at (-panX/zoom, -panY/zoom)
  // and has size (canvasWidth/zoom, canvasHeight/zoom)
  // Add some padding to ensure smooth scrolling
  const padding = 1000;
  const viewBoxLeft = -viewport.panX / viewport.zoom;
  const viewBoxTop = -viewport.panY / viewport.zoom;
  const viewBoxRight = viewBoxLeft + canvasSize.width / viewport.zoom;
  const viewBoxBottom = viewBoxTop + canvasSize.height / viewport.zoom;
  
  const left = viewBoxLeft - padding;
  const right = viewBoxRight + padding;
  const top = viewBoxTop - padding;
  const bottom = viewBoxBottom + padding;

  // Generate ruler labels first to determine major line spacing
  const rulerLabels: Array<{ x: number; y: number; text: string; isXAxis: boolean }> = [];
  let finalSpacingX = spacing * 10; // Default fallback
  let finalSpacingY = spacing * 10; // Default fallback

  if (grid.showRulers) {
    // Dynamic spacing based on screen space and zoom to prevent overlap
    // Consider both grid size and available screen space
    const estimatedLabelWidth = 40; // Rough estimate of label width in pixels (for numbers like "100")
    const minScreenSpacing = estimatedLabelWidth * 1.5; // Minimum 1.5x label width spacing

    // Calculate how many labels can fit on screen
    const availableScreenWidth = canvasSize.width;
    const maxLabelsOnScreen = Math.floor(availableScreenWidth / minScreenSpacing);

    // World space calculations
    const worldViewWidth = canvasSize.width / viewport.zoom;
    const worldViewHeight = canvasSize.height / viewport.zoom;

    // Minimum spacing in world coordinates to prevent overlap
    const minWorldSpacingX = (worldViewWidth / maxLabelsOnScreen);
    const minWorldSpacingY = (worldViewHeight / maxLabelsOnScreen);

    // Use the larger of: grid-based spacing or screen-space required spacing
    const gridBasedSpacing = spacing * 10; // Base grid spacing (every 10 grid lines)
    const screenBasedSpacingX = Math.max(minWorldSpacingX, gridBasedSpacing);
    const screenBasedSpacingY = Math.max(minWorldSpacingY, gridBasedSpacing);

    // Final spacing - ensure it's a multiple of grid spacing
    finalSpacingX = Math.ceil(screenBasedSpacingX / spacing) * spacing;
    finalSpacingY = Math.ceil(screenBasedSpacingY / spacing) * spacing;

    // X-axis labels (horizontal, at the top)
    for (let x = Math.ceil(left / finalSpacingX) * finalSpacingX; x <= right; x += finalSpacingX) {
      rulerLabels.push({
        x: x,
        y: viewBoxTop + 30 / viewport.zoom,
        text: (Math.round(x / spacing) * spacing).toString(),
        isXAxis: true,
      });
    }

    // Y-axis labels (vertical, at the left)
    for (let y = Math.ceil(top / finalSpacingY) * finalSpacingY; y <= bottom; y += finalSpacingY) {
      rulerLabels.push({
        x: viewBoxLeft + 30 / viewport.zoom,
        y: y,
        text: (Math.round(y / spacing) * spacing).toString(),
        isXAxis: false,
      });
    }
  }

  // Build path data for grid lines - separate major and minor lines
  let minorPathData = '';
  let majorPathData = '';

  // Vertical lines
  const startX = Math.floor(left / spacing) * spacing;
  const endX = Math.ceil(right / spacing) * spacing;

  for (let x = startX; x <= endX; x += spacing) {
    // Check if this is a major line (has a label)
    const isMajorX = Math.abs(x % finalSpacingX) < spacing / 2;
    if (isMajorX) {
      majorPathData += `M ${x} ${top} L ${x} ${bottom} `;
    } else {
      minorPathData += `M ${x} ${top} L ${x} ${bottom} `;
    }
  }

  // Horizontal lines
  const startY = Math.floor(top / spacing) * spacing;
  const endY = Math.ceil(bottom / spacing) * spacing;

  for (let y = startY; y <= endY; y += spacing) {
    // Check if this is a major line (has a label)
    const isMajorY = Math.abs(y % finalSpacingY) < spacing / 2;
    if (isMajorY) {
      majorPathData += `M ${left} ${y} L ${right} ${y} `;
    } else {
      minorPathData += `M ${left} ${y} L ${right} ${y} `;
    }
  }

  return (
    <g>
      {/* Minor grid lines (thinner) */}
      <path
        d={minorPathData}
        stroke="#e0e0e0"
        strokeWidth={0.5 / viewport.zoom}
        pointerEvents="none"
        fill="none"
      />
      {/* Major grid lines (thicker, highlighted) */}
      <path
        d={majorPathData}
        stroke="#b0b0b0"
        strokeWidth={1.5 / viewport.zoom}
        pointerEvents="none"
        fill="none"
      />
      {rulerLabels.map((label, index) => (
        <text
          key={index}
          x={label.x}
          y={label.y}
          fontSize={12 / viewport.zoom}
          fill="#9ca3af"
          fontWeight="normal"
          textAnchor={label.isXAxis ? "middle" : "start"}
          dominantBaseline={label.isXAxis ? "hanging" : "middle"}
          pointerEvents="none"
          style={{ userSelect: 'none' }}
        >
          {label.text}
        </text>
      ))}
    </g>
  );
});