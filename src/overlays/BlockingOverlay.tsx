import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';

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
  isActive?: boolean;
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
  const overlayFill = useColorModeValue('#ffffff01', '#0f172a33');
  if (!(isActive ?? false)) {
    return null;
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (onPointerUp) {
      onPointerUp(e);
    }
  };

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
          fill={overlayFill}
          style={{
            cursor: 'inherit',
          }}
        />
      </g>
    </>
  );
};
