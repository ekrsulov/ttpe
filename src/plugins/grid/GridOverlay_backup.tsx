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

/**
 * Calculate optimal ruler interval based on zoom level and grid spacing
 * Follows best practices from design tools (Figma, Sketch, Illustrator)
 */
function calculateRulerInterval(spacing: number, zoom: number): number {
  // Base grid spacing in canvas coordinates
  const baseSpacing = spacing;
  
  // Target: labels should appear when grid cells are 40-100px on screen
  // This provides optimal readability across zoom levels
  const minScreenSpacing = 50; // Minimum distance between labels in screen pixels
  
  // Intervals to try (in multiples of base grid spacing)
  // Follows common ruler patterns: 1, 2, 5, 10, 20, 50, 100, etc.
  const multipliers = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
  
  // Find the best multiplier that gives us comfortable spacing on screen
  for (const multiplier of multipliers) {
    const intervalSpacing = baseSpacing * multiplier;
    const screenSpacing = intervalSpacing * zoom;
    
    // Use this interval if it's >= minimum screen spacing
    if (screenSpacing >= minScreenSpacing) {
      return intervalSpacing;
    }
  }
  
  // Fallback: use the largest multiplier if we're extremely zoomed out
  return baseSpacing * multipliers[multipliers.length - 1];
}

/**
 * Format ruler label for better readability
 */
function formatRulerLabel(value: number): string {
  // Round to avoid floating point artifacts
  const rounded = Math.round(value);
  
  // For large numbers, use k suffix (1000 -> 1k)
  if (Math.abs(rounded) >= 1000) {
    const thousands = rounded / 1000;
    // Only show decimal if it's not a whole number
    return thousands % 1 === 0 ? `${thousands}k` : `${thousands.toFixed(1)}k`;
  }
  
  return rounded.toString();
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
  // Add padding to ensure smooth scrolling
  const padding = 1000;
  const viewBoxLeft = -viewport.panX / viewport.zoom;
  const viewBoxTop = -viewport.panY / viewport.zoom;
  const viewBoxRight = viewBoxLeft + canvasSize.width / viewport.zoom;
  const viewBoxBottom = viewBoxTop + canvasSize.height / viewport.zoom;
  
  const left = viewBoxLeft - padding;
  const right = viewBoxRight + padding;
  const top = viewBoxTop - padding;
  const bottom = viewBoxBottom + padding;

  // Calculate optimal ruler interval based on zoom
  const rulerInterval = calculateRulerInterval(spacing, viewport.zoom);
  
  // Build ruler labels and tick marks
  const rulerElements: React.ReactElement[] = [];
  
  if (grid.showRulers) {
    // Ruler strip dimensions in world coordinates
    const rulerHeight = 20 / viewport.zoom; // Height/width of ruler strip (horizontal)
    const rulerWidth = 35 / viewport.zoom; // Width of vertical ruler strip (wider for numbers)
    const fontSize = 10 / viewport.zoom;
    const tickHeight = 4 / viewport.zoom; // Major tick height
    const minorTickHeight = 2 / viewport.zoom; // Minor tick height
    const labelOffset = 3 / viewport.zoom; // Space between tick and label
    
    // Background for horizontal ruler (top)
    rulerElements.push(
      <rect
        key="ruler-bg-h"
        x={viewBoxLeft}
        y={viewBoxTop}
        width={canvasSize.width / viewport.zoom}
        height={rulerHeight}
        fill="rgba(255, 255, 255, 0.95)"
        stroke="#d0d0d0"
        strokeWidth={0.5 / viewport.zoom}
        pointerEvents="none"
      />
    );
    
    // Background for vertical ruler (left)
    rulerElements.push(
      <rect
        key="ruler-bg-v"
        x={viewBoxLeft}
        y={viewBoxTop}
        width={rulerWidth}
        height={canvasSize.height / viewport.zoom}
        fill="rgba(255, 255, 255, 0.95)"
        stroke="#d0d0d0"
        strokeWidth={0.5 / viewport.zoom}
        pointerEvents="none"
      />
    );
    
    // Corner piece (where horizontal and vertical rulers meet)
    rulerElements.push(
      <rect
        key="ruler-corner"
        x={viewBoxLeft}
        y={viewBoxTop}
        width={rulerWidth}
        height={rulerHeight}
        fill="rgba(255, 255, 255, 0.95)"
        stroke="#d0d0d0"
        strokeWidth={0.5 / viewport.zoom}
        pointerEvents="none"
      />
    );

    // Horizontal ruler (X-axis) - shows values along the top
    const startX = Math.floor(viewBoxLeft / rulerInterval) * rulerInterval;
    const endX = Math.ceil(viewBoxRight / rulerInterval) * rulerInterval;
    
    for (let x = startX; x <= endX; x += spacing) {
      const screenX = x;
      
      // Only draw if within visible area (with some margin)
      if (screenX < viewBoxLeft - spacing || screenX > viewBoxRight + spacing) continue;
      
      const isMajorTick = Math.abs(x % rulerInterval) < spacing / 2;
      
      if (isMajorTick) {
        // Major tick
        rulerElements.push(
          <line
            key={`h-tick-${x}`}
            x1={screenX}
            y1={viewBoxTop + rulerHeight}
            x2={screenX}
            y2={viewBoxTop + rulerHeight - tickHeight}
            stroke="#666"
            strokeWidth={0.8 / viewport.zoom}
            pointerEvents="none"
          />
        );
        
        // Label
        const label = formatRulerLabel(x);
        rulerElements.push(
          <text
            key={`h-label-${x}`}
            x={screenX}
            y={viewBoxTop + rulerHeight - tickHeight - labelOffset}
            fontSize={fontSize}
            fill="#444"
            fontWeight="500"
            textAnchor="middle"
            dominantBaseline="auto"
            pointerEvents="none"
            style={{ userSelect: 'none', fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {label}
          </text>
        );
      } else if (rulerInterval / spacing >= 4) {
        // Minor tick (only show if there's enough space between major ticks)
        rulerElements.push(
          <line
            key={`h-minor-${x}`}
            x1={screenX}
            y1={viewBoxTop + rulerHeight}
            x2={screenX}
            y2={viewBoxTop + rulerHeight - minorTickHeight}
            stroke="#999"
            strokeWidth={0.5 / viewport.zoom}
            pointerEvents="none"
          />
        );
      }
    }

    // Vertical ruler (Y-axis) - shows values along the left
    const startY = Math.floor(viewBoxTop / rulerInterval) * rulerInterval;
    const endY = Math.ceil(viewBoxBottom / rulerInterval) * rulerInterval;
    
    for (let y = startY; y <= endY; y += spacing) {
      const screenY = y;
      
      // Only draw if within visible area (with some margin)
      if (screenY < viewBoxTop - spacing || screenY > viewBoxBottom + spacing) continue;
      
      const isMajorTick = Math.abs(y % rulerInterval) < spacing / 2;
      
      if (isMajorTick) {
        // Major tick
        rulerElements.push(
          <line
            key={`v-tick-${y}`}
            x1={viewBoxLeft + rulerWidth}
            y1={screenY}
            x2={viewBoxLeft + rulerWidth - tickHeight}
            y2={screenY}
            stroke="#666"
            strokeWidth={0.8 / viewport.zoom}
            pointerEvents="none"
          />
        );
        
        // Label
        const label = formatRulerLabel(y);
        rulerElements.push(
          <text
            key={`v-label-${y}`}
            x={viewBoxLeft + rulerWidth - tickHeight - labelOffset}
            y={screenY}
            fontSize={fontSize}
            fill="#444"
            fontWeight="500"
            textAnchor="end"
            dominantBaseline="middle"
            pointerEvents="none"
            style={{ userSelect: 'none', fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {label}
          </text>
        );
      } else if (rulerInterval / spacing >= 4) {
        // Minor tick (only show if there's enough space between major ticks)
        rulerElements.push(
          <line
            key={`v-minor-${y}`}
            x1={viewBoxLeft + rulerWidth}
            y1={screenY}
            x2={viewBoxLeft + rulerWidth - minorTickHeight}
            y2={screenY}
            stroke="#999"
            strokeWidth={0.5 / viewport.zoom}
            pointerEvents="none"
          />
        );
      }
    }
  }

  // Build path data for grid lines
  // Separate major lines (at ruler intervals) from minor lines
  let minorPathData = '';
  let majorPathData = '';

  // Vertical lines
  const startX = Math.floor(left / spacing) * spacing;
  const endX = Math.ceil(right / spacing) * spacing;

  for (let x = startX; x <= endX; x += spacing) {
    const isMajor = Math.abs(x % rulerInterval) < spacing / 2;
    if (isMajor) {
      majorPathData += `M ${x} ${top} L ${x} ${bottom} `;
    } else {
      minorPathData += `M ${x} ${top} L ${x} ${bottom} `;
    }
  }

  // Horizontal lines
  const startY = Math.floor(top / spacing) * spacing;
  const endY = Math.ceil(bottom / spacing) * spacing;

  for (let y = startY; y <= endY; y += spacing) {
    const isMajor = Math.abs(y % rulerInterval) < spacing / 2;
    if (isMajor) {
      majorPathData += `M ${left} ${y} L ${right} ${y} `;
    } else {
      minorPathData += `M ${left} ${y} L ${right} ${y} `;
    }
  }

  return (
    <g>
      {/* Minor grid lines (subtle) */}
      <path
        d={minorPathData}
        stroke="#e8e8e8"
        strokeWidth={0.5 / viewport.zoom}
        pointerEvents="none"
        fill="none"
      />
      {/* Major grid lines (more prominent) */}
      <path
        d={majorPathData}
        stroke="#d0d0d0"
        strokeWidth={1 / viewport.zoom}
        pointerEvents="none"
        fill="none"
      />
      
      {/* Ruler elements (rendered last so they appear on top) */}
      {rulerElements}
    </g>
  );
});