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

  return (
    <>
      {/* Corner handlers - Always visible */}
      {/* Top-left corner */}
      <polygon
        points={`${bounds.minX},${bounds.minY} ${bounds.minX + 18 / viewport.zoom},${bounds.minY} ${bounds.minX},${bounds.minY + 18 / viewport.zoom}`}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        opacity="0.5"
        pointerEvents="none"
      />
      {/* Top-left corner overlay */}
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={18 / viewport.zoom}
        height={18 / viewport.zoom}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'nw-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'corner-tl')}
        onPointerUp={onPointerUp}
      />

      {/* Top-right corner */}
      <polygon
        points={`${bounds.maxX},${bounds.minY} ${bounds.maxX - 18 / viewport.zoom},${bounds.minY} ${bounds.maxX},${bounds.minY + 18 / viewport.zoom}`}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        opacity="0.5"
        pointerEvents="none"
      />
      {/* Top-right corner overlay */}
      <rect
        x={bounds.maxX - 18 / viewport.zoom}
        y={bounds.minY}
        width={18 / viewport.zoom}
        height={18 / viewport.zoom}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'ne-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'corner-tr')}
        onPointerUp={onPointerUp}
      />

      {/* Bottom-left corner */}
      <polygon
        points={`${bounds.minX},${bounds.maxY} ${bounds.minX + 18 / viewport.zoom},${bounds.maxY} ${bounds.minX},${bounds.maxY - 18 / viewport.zoom}`}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        opacity="0.5"
        pointerEvents="none"
      />
      {/* Bottom-left corner overlay */}
      <rect
        x={bounds.minX}
        y={bounds.maxY - 18 / viewport.zoom}
        width={18 / viewport.zoom}
        height={18 / viewport.zoom}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'sw-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'corner-bl')}
        onPointerUp={onPointerUp}
      />

      {/* Bottom-right corner */}
      <polygon
        points={`${bounds.maxX},${bounds.maxY} ${bounds.maxX - 18 / viewport.zoom},${bounds.maxY} ${bounds.maxX},${bounds.maxY - 18 / viewport.zoom}`}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        opacity="0.5"
        pointerEvents="none"
      />
      {/* Bottom-right corner overlay */}
      <rect
        x={bounds.maxX - 18 / viewport.zoom}
        y={bounds.maxY - 18 / viewport.zoom}
        width={18 / viewport.zoom}
        height={18 / viewport.zoom}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'se-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'corner-br')}
        onPointerUp={onPointerUp}
      />

      {/* Rotation handlers */}
      <circle
        cx={bounds.maxX + handlerSize}
        cy={bounds.minY - handlerSize}
        r={handlerSize / 2}
        fill={selectionColor}
        stroke="#fff"
        strokeWidth={1 / viewport.zoom}
        opacity="0.5"
        style={{ cursor: 'alias' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'rotate-tr')}
        onPointerUp={onPointerUp}
      />

      {/* Midpoint handlers (Side handlers) - Complete lines */}
      {/* Top line */}
      <rect
        x={bounds.minX + handlerSize + 10}
        y={bounds.minY}
        width={Math.max(0, bounds.maxX - bounds.minX - 2 * handlerSize - 20)}
        height={2 / viewport.zoom}
        fill={selectionColor}
        opacity="0.5"
        pointerEvents="none"
      />
      {/* Top overlay */}
      <rect
        x={bounds.minX + handlerSize + 10}
        y={bounds.minY - 8 / viewport.zoom}
        width={Math.max(0, bounds.maxX - bounds.minX - 2 * handlerSize - 20)}
        height={18 / viewport.zoom}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'n-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'midpoint-t')}
        onPointerUp={onPointerUp}
      />

      {/* Right line */}
      <rect
        x={bounds.maxX - 2 / viewport.zoom}
        y={bounds.minY + handlerSize + 10}
        width={2 / viewport.zoom}
        height={Math.max(0, bounds.maxY - bounds.minY - 2 * handlerSize - 20)}
        fill={selectionColor}
        opacity="0.5"
        pointerEvents="none"
      />
      {/* Right overlay */}
      <rect
        x={bounds.maxX - 2 / viewport.zoom - 8 / viewport.zoom}
        y={bounds.minY + handlerSize + 10}
        width={18 / viewport.zoom}
        height={Math.max(0, bounds.maxY - bounds.minY - 2 * handlerSize - 20)}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'e-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'midpoint-r')}
        onPointerUp={onPointerUp}
      />

      {/* Bottom line */}
      <rect
        x={bounds.minX + handlerSize + 10}
        y={bounds.maxY - 2 / viewport.zoom}
        width={Math.max(0, bounds.maxX - bounds.minX - 2 * handlerSize - 20)}
        height={2 / viewport.zoom}
        fill={selectionColor}
        opacity="0.5"
        pointerEvents="none"
      />
      {/* Bottom overlay */}
      <rect
        x={bounds.minX + handlerSize + 10}
        y={bounds.maxY - 2 / viewport.zoom - 8 / viewport.zoom}
        width={Math.max(0, bounds.maxX - bounds.minX - 2 * handlerSize - 20)}
        height={18 / viewport.zoom}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 's-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'midpoint-b')}
        onPointerUp={onPointerUp}
      />

      {/* Left line */}
      <rect
        x={bounds.minX}
        y={bounds.minY + handlerSize + 10}
        width={2 / viewport.zoom}
        height={Math.max(0, bounds.maxY - bounds.minY - 2 * handlerSize - 20)}
        fill={selectionColor}
        opacity="0.5"
        pointerEvents="none"
      />
      {/* Left overlay */}
      <rect
        x={bounds.minX - 8 / viewport.zoom}
        y={bounds.minY + handlerSize + 10}
        width={18 / viewport.zoom}
        height={Math.max(0, bounds.maxY - bounds.minY - 2 * handlerSize - 20)}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'w-resize' }}
        onPointerDown={(e) => onPointerDown(e, generateTargetId(), 'midpoint-l')}
        onPointerUp={onPointerUp}
      />
    </>
  );
};