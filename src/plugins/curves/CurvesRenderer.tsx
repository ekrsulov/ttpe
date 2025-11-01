import React from 'react';
import { useColorMode } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { useCanvasCurves } from './useCanvasCurves';
import type { CurvePoint } from '../../types';

export const CurvesRenderer: React.FC = () => {
  const { colorMode } = useColorMode();
  const viewport = useCanvasStore(state => state.viewport);
  const { curveState } = useCanvasCurves();

  // Use gray tones for curve preview
  const previewColor = colorMode === 'dark' ? '#dee2e6' : '#6b7280'; // gray.300 : gray.500
  const pointFill = colorMode === 'dark' ? '#374151' : '#fff'; // gray.700 : white
  const handleFill = colorMode === 'dark' ? '#374151' : '#fff'; // gray.700 : white

  // Don't render if not active
  if (!curveState.isActive) {
    return null;
  }

  // Generate preview path
  const previewPath = generatePreviewPath(curveState.points, curveState.isClosingPath);

  const svgElements: React.ReactElement[] = [];

  // Render preview path
  if (previewPath && curveState.points.length > 1) {
    svgElements.push(
      <path
        key="preview-path"
        d={previewPath}
        stroke={previewColor}
        strokeWidth={2 / viewport.zoom}
        fill="none"
        strokeDasharray={`${5 / viewport.zoom} ${5 / viewport.zoom}`}
        opacity={0.7}
      />
    );
  }

  // Render points and handles
  curveState.points.forEach((point, index) => {
    const isSelected = point.selected || curveState.selectedPointId === point.id;

    // Main point
    svgElements.push(
      <circle
        key={`point-${point.id}`}
        cx={point.x}
        cy={point.y}
        r={8 / viewport.zoom}
        fill={isSelected ? previewColor : pointFill}
        stroke={previewColor}
        strokeWidth={2 / viewport.zoom}
        style={{ cursor: 'pointer' }}
      />
    );

    // Point label
    svgElements.push(
      <text
        key={`point-label-${point.id}`}
        x={point.x + 12 / viewport.zoom}
        y={point.y - 8 / viewport.zoom}
        fill={previewColor}
        fontSize={12 / viewport.zoom}
        fontWeight="bold"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {index}
      </text>
    );

    // Handle lines and control points
    if (point.handleIn) {
      // Line from point to handleIn
      svgElements.push(
        <line
          key={`handle-in-line-${point.id}`}
          x1={point.x}
          y1={point.y}
          x2={point.handleIn.x}
          y2={point.handleIn.y}
          stroke={previewColor}
          strokeWidth={1 / viewport.zoom}
          opacity={0.5}
        />
      );

      // HandleIn control point
      svgElements.push(
        <circle
          key={`handle-in-${point.id}`}
          cx={point.handleIn.x}
          cy={point.handleIn.y}
          r={4 / viewport.zoom}
          fill={handleFill}
          stroke={previewColor}
          strokeWidth={1 / viewport.zoom}
          style={{ cursor: 'pointer' }}
        />
      );
    }

    if (point.handleOut) {
      // Line from point to handleOut
      svgElements.push(
        <line
          key={`handle-out-line-${point.id}`}
          x1={point.x}
          y1={point.y}
          x2={point.handleOut.x}
          y2={point.handleOut.y}
          stroke={previewColor}
          strokeWidth={1 / viewport.zoom}
          opacity={0.5}
        />
      );

      // HandleOut control point
      svgElements.push(
        <circle
          key={`handle-out-${point.id}`}
          cx={point.handleOut.x}
          cy={point.handleOut.y}
          r={4 / viewport.zoom}
          fill={handleFill}
          stroke={previewColor}
          strokeWidth={1 / viewport.zoom}
          style={{ cursor: 'pointer' }}
        />
      );
    }
  });

  // Render preview point (next point to be placed)
  if (curveState.previewPoint) {
    svgElements.push(
      <circle
        key="preview-point"
        cx={curveState.previewPoint.x}
        cy={curveState.previewPoint.y}
        r={6 / viewport.zoom}
        fill="none"
        stroke={previewColor}
        strokeWidth={2 / viewport.zoom}
        strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
        opacity={0.5}
      />
    );
  }

  return <g>{svgElements}</g>;
};

function generatePreviewPath(points: CurvePoint[], isClosingPath?: boolean): string | null {
  if (points.length < 2) return null;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];

    if (current.handleOut && next.handleIn) {
      // Cubic Bézier curve
      path += ` C ${current.handleOut.x} ${current.handleOut.y} ${next.handleIn.x} ${next.handleIn.y} ${next.x} ${next.y}`;
    } else {
      // Line
      path += ` L ${next.x} ${next.y}`;
    }
  }

  // Add closing segment preview if closing path
  if (isClosingPath && points.length > 2) {
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    if (lastPoint.handleOut && firstPoint.handleIn) {
      // Cubic Bézier curve for closing segment
      path += ` C ${lastPoint.handleOut.x} ${lastPoint.handleOut.y} ${firstPoint.handleIn.x} ${firstPoint.handleIn.y} ${firstPoint.x} ${firstPoint.y}`;
    } else {
      // Line for closing segment
      path += ` L ${firstPoint.x} ${firstPoint.y}`;
    }
  }

  return path;
}