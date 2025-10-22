import React from 'react';

interface BlockingOverlayProps {
  viewport: {
    panX: number;
    panY: number;
    zoom: number;
  };
  canvasSize: {
    width: number;
    height: number;
  };
  isActive: boolean;
  onPointerUp?: (e: React.PointerEvent) => void;
}

/**
 * BlockingOverlay - A nearly transparent overlay that blocks pointer events
 * to underlying canvas elements, preventing unwanted interactions during
 * drag operations in transformation and shape modes.
 */
export const BlockingOverlay: React.FC<BlockingOverlayProps> = ({
  viewport,
  canvasSize,
  isActive,
  onPointerUp,
}) => {
  if (!isActive) {
    return null;
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (onPointerUp) {
      onPointerUp(e);
    }
  };

  if (!isActive) {
    return null;
  }

  return (
    <>
      {/* Add a group that captures all pointer events */}
      <g
        style={{
          pointerEvents: 'all',
        }}
        onPointerUp={handlePointerUp}
      >
        <rect
          x={-viewport.panX / viewport.zoom}
          y={-viewport.panY / viewport.zoom}
          width={canvasSize.width / viewport.zoom}
          height={canvasSize.height / viewport.zoom}
          fill="#ffffff01"
          style={{
            cursor: 'inherit',
          }}
        />
      </g>
    </>
  );
};
