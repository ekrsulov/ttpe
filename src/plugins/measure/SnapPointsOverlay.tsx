import React from 'react';
import { useColorMode } from '@chakra-ui/react';
import type { SnapPointCache } from './slice';
import type { Viewport } from '../../types';

interface SnapPointsOverlayProps {
  snapPoints: SnapPointCache[];
  viewport: Viewport;
  opacity: number; // 0-100
}

/**
 * Renders subtle crosses at all snap points when in measure mode
 */
export const SnapPointsOverlay: React.FC<SnapPointsOverlayProps> = ({ snapPoints, viewport, opacity }) => {
  const { colorMode } = useColorMode();
  
  const zoom = viewport.zoom;
  const crossSize = 4 / zoom; // Size of the cross in canvas units
  const strokeWidth = 0.5 / zoom;
  
  // Map opacity from 0-100 to 0-1, with higher values being more opaque
  const opacityValue = opacity / 100;
  
  // En modo oscuro: más claro cuando opacity es alto, en modo claro: más oscuro cuando opacity es alto
  const color = colorMode === 'dark' 
    ? `rgba(203, 213, 225, ${opacityValue})`
    : `rgba(51, 65, 85, ${opacityValue})`;

  return (
    <g className="measure-snap-points">
      {snapPoints.map((snap, index) => {
        const { x, y } = snap.point;
        return (
          <g key={`snap-${snap.elementId}-${index}`}>
            {/* Horizontal line */}
            <line
              x1={x - crossSize}
              y1={y}
              x2={x + crossSize}
              y2={y}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Vertical line */}
            <line
              x1={x}
              y1={y - crossSize}
              x2={x}
              y2={y + crossSize}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </g>
  );
};
