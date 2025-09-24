import React from 'react';

interface TransformationHandlersProps {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  elementId: string;
  subpathIndex?: number; // Optional for individual subpath handlers
  handlerSize: number;
  selectionColor: string;
  viewport: { zoom: number };
  onPointerDown: (e: React.PointerEvent, targetId: string, handlerType: string) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

/**
 * Unified transformation handlers component that consolidates the logic for both
 * element-level and subpath-level transformation handlers.
 * This replaces the duplicated renderTransformationHandlers and renderIndividualSubpathHandlers functions.
 */
export const TransformationHandlers: React.FC<TransformationHandlersProps> = ({
  bounds,
  elementId,
  subpathIndex,
  handlerSize,
  selectionColor,
  viewport,
  onPointerDown,
  onPointerUp
}) => {
  // Generate target ID based on whether this is for a subpath or element
  const generateTargetId = () => {
    if (subpathIndex !== undefined) {
      return `subpath:${elementId}:${subpathIndex}`;
    }
    return elementId;
  };

  const triangleOpacity = "0.5";
  const lineOpacity = "1";
  const triangleSize = handlerSize;
  const lineSeparation = 5 / viewport.zoom;
  const overlaySize = 20 / viewport.zoom;
  const lineThickness = 1;
  const circleSize = handlerSize * 0.75;

  return (
    <>
      {/* Corner handlers - Always visible */}
      {/* Top-left corner */}
      <polygon
        points={`${bounds.minX},${bounds.minY} ${bounds.minX + triangleSize},${bounds.minY} ${bounds.minX},${bounds.minY + triangleSize}`}
        fill={selectionColor}
        opacity={triangleOpacity}
        pointerEvents="none"
      />
      {/* Top-left corner L lines */}
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={triangleSize}
        height={lineThickness / viewport.zoom}
        fill={selectionColor}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={lineThickness / viewport.zoom}
        height={triangleSize}
        fill={selectionColor}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Top-left corner overlay */}
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={triangleSize}
        height={triangleSize}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'nw-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'corner-tl')}
        onPointerUp={onPointerUp}
      />

      {/* Top-right corner */}
      <polygon
        points={`${bounds.maxX},${bounds.minY} ${bounds.maxX - triangleSize},${bounds.minY} ${bounds.maxX},${bounds.minY + triangleSize}`}
        fill={selectionColor}
        opacity={triangleOpacity}
        pointerEvents="none"
      />
      {/* Top-right corner L lines */}
      <rect
        x={bounds.maxX - triangleSize}
        y={bounds.minY}
        width={triangleSize}
        height={lineThickness / viewport.zoom}
        fill={selectionColor}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      <rect
        x={bounds.maxX - lineThickness / viewport.zoom}
        y={bounds.minY}
        width={lineThickness / viewport.zoom}
        height={triangleSize}
        fill={selectionColor}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Top-right corner overlay */}
      <rect
        x={bounds.maxX - triangleSize}
        y={bounds.minY}
        width={triangleSize}
        height={triangleSize}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'ne-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'corner-tr')}
        onPointerUp={onPointerUp}
      />

      {/* Bottom-left corner */}
      <polygon
        points={`${bounds.minX},${bounds.maxY} ${bounds.minX + triangleSize},${bounds.maxY} ${bounds.minX},${bounds.maxY - triangleSize}`}
        fill={selectionColor}
        opacity={triangleOpacity}
        pointerEvents="none"
      />
      {/* Bottom-left corner L lines */}
      <rect
        x={bounds.minX}
        y={bounds.maxY - lineThickness / viewport.zoom}
        width={triangleSize}
        height={lineThickness / viewport.zoom}
        fill={selectionColor}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      <rect
        x={bounds.minX}
        y={bounds.maxY - triangleSize}
        width={lineThickness / viewport.zoom}
        height={triangleSize}
        fill={selectionColor}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Bottom-left corner overlay */}
      <rect
        x={bounds.minX}
        y={bounds.maxY - triangleSize}
        width={triangleSize}
        height={triangleSize}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'sw-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'corner-bl')}
        onPointerUp={onPointerUp}
      />

      {/* Bottom-right corner */}
      <polygon
        points={`${bounds.maxX},${bounds.maxY} ${bounds.maxX - triangleSize},${bounds.maxY} ${bounds.maxX},${bounds.maxY - triangleSize}`}
        fill={selectionColor}
        opacity={triangleOpacity}
        pointerEvents="none"
      />
      {/* Bottom-right corner L lines */}
      <rect
        x={bounds.maxX - triangleSize}
        y={bounds.maxY - lineThickness / viewport.zoom}
        width={triangleSize}
        height={lineThickness / viewport.zoom}
        fill={selectionColor}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      <rect
        x={bounds.maxX - lineThickness / viewport.zoom}
        y={bounds.maxY - triangleSize}
        width={lineThickness / viewport.zoom}
        height={triangleSize}
        fill={selectionColor}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Bottom-right corner overlay */}
      <rect
        x={bounds.maxX - triangleSize}
        y={bounds.maxY - triangleSize}
        width={triangleSize}
        height={triangleSize}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'se-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'corner-br')}
        onPointerUp={onPointerUp}
      />

      {/* Rotation handlers */}
      <circle
        cx={bounds.maxX + circleSize}
        cy={bounds.minY - circleSize}
        r={circleSize / 2}
        fill={selectionColor}
        fillOpacity={triangleOpacity}
        strokeOpacity={lineOpacity}
        stroke={selectionColor}
        style={{ cursor: 'alias' }}
        strokeWidth={lineThickness}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'rotate-tr')}
        vectorEffect="non-scaling-stroke"
        onPointerUp={onPointerUp}
      />

      {/* Midpoint handlers (Side handlers) - Complete lines */}
      {/* Top line */}
      <rect
        x={bounds.minX + handlerSize + lineSeparation}
        y={bounds.minY}
        width={Math.max(0, bounds.maxX - bounds.minX - 2 * handlerSize - 2 * lineSeparation)}
        height={lineThickness / viewport.zoom}
        fill={selectionColor}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Top overlay */}
      <rect
        x={bounds.minX + handlerSize + lineSeparation}
        y={bounds.minY - 8 / viewport.zoom}
        width={Math.max(0, bounds.maxX - bounds.minX - 2 * handlerSize - 2 * lineSeparation)}
        height={overlaySize / viewport.zoom}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'n-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'midpoint-t')}
        onPointerUp={onPointerUp}
      />

      {/* Right line */}
      <rect
        x={bounds.maxX - lineThickness / viewport.zoom}
        y={bounds.minY + handlerSize + lineSeparation}
        width={lineThickness / viewport.zoom}
        height={Math.max(0, bounds.maxY - bounds.minY - 2 * handlerSize - 2 * lineSeparation)}
        fill={selectionColor}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Right overlay */}
      <rect
        x={bounds.maxX - lineThickness / viewport.zoom - 8 / viewport.zoom}
        y={bounds.minY + handlerSize + lineSeparation}
        width={overlaySize / viewport.zoom}
        height={Math.max(0, bounds.maxY - bounds.minY - 2 * handlerSize - 2 * lineSeparation)}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'e-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'midpoint-r')}
        onPointerUp={onPointerUp}
      />

      {/* Bottom line */}
      <rect
        x={bounds.minX + handlerSize + lineSeparation}
        y={bounds.maxY - lineThickness / viewport.zoom}
        width={Math.max(0, bounds.maxX - bounds.minX - 2 * handlerSize - 2 * lineSeparation)}
        height={lineThickness / viewport.zoom}
        fill={selectionColor}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Bottom overlay */}
      <rect
        x={bounds.minX + handlerSize + lineSeparation}
        y={bounds.maxY - lineThickness / viewport.zoom - 8 / viewport.zoom}
        width={Math.max(0, bounds.maxX - bounds.minX - 2 * handlerSize - 2 * lineSeparation)}
        height={overlaySize / viewport.zoom}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 's-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'midpoint-b')}
        onPointerUp={onPointerUp}
      />

      {/* Left line */}
      <rect
        x={bounds.minX}
        y={bounds.minY + handlerSize + lineSeparation}
        width={lineThickness / viewport.zoom}
        height={Math.max(0, bounds.maxY - bounds.minY - 2 * handlerSize - 2 * lineSeparation)}
        fill={selectionColor}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Left overlay */}
      <rect
        x={bounds.minX - 8 / viewport.zoom}
        y={bounds.minY + handlerSize + lineSeparation}
        width={overlaySize / viewport.zoom}
        height={Math.max(0, bounds.maxY - bounds.minY - 2 * handlerSize - 2 * lineSeparation)}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'w-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'midpoint-l')}
        onPointerUp={onPointerUp}
      />
    </>
  );
};