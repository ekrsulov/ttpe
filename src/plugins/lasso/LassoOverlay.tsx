import React from 'react';
import { useColorMode } from '@chakra-ui/react';

interface LassoOverlayProps {
  lassoPath: Array<{ x: number; y: number }>;
  viewport: { zoom: number };
}

export const LassoOverlay: React.FC<LassoOverlayProps> = ({ lassoPath, viewport }) => {
  const { colorMode } = useColorMode();

  if (lassoPath.length < 2) {
    return null;
  }

  // Convert points to SVG path
  const pathData = lassoPath.reduce((acc, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    return `${acc} L ${point.x} ${point.y}`;
  }, '');

  // Close the path
  const closedPath = `${pathData} Z`;

  // Use gray tones for lasso overlay (same as selection rectangle)
  const strokeColor = colorMode === 'dark' ? '#dee2e6' : '#6b7280'; // gray.300 : gray.500
  const fillColor = colorMode === 'dark' ? 'rgba(222, 226, 230, 0.1)' : 'rgba(107, 114, 128, 0.1)';

  return (
    <path
      d={closedPath}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={1 / viewport.zoom}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
      pointerEvents="none"
    />
  );
};
