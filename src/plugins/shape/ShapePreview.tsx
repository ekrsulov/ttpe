import React from 'react';
import { useColorMode } from '@chakra-ui/react';
import type { Point } from '../../types';

interface ShapePreviewProps {
  selectedShape?: string;
  shapeStart: Point;
  shapeEnd: Point;
  viewport: {
    zoom: number;
  };
}

export const ShapePreview: React.FC<ShapePreviewProps> = ({
  selectedShape = 'rectangle',
  shapeStart,
  shapeEnd,
  viewport,
}) => {
  const { colorMode } = useColorMode();
  
  // Use direct color values for SVG compatibility
  // Same blue as active buttons, switches, checkboxes, etc.
  const previewColor = colorMode === 'dark' ? '#63b3ed' : '#007bff'; // blue.300 : brand.500

  const width = Math.abs(shapeEnd.x - shapeStart.x);
  const height = Math.abs(shapeEnd.y - shapeStart.y);
  const centerX = (shapeStart.x + shapeEnd.x) / 2;
  const centerY = (shapeStart.y + shapeEnd.y) / 2;

  let pathData = '';

  switch (selectedShape) {
    case 'square': {
      const halfSize = Math.min(width, height) / 2;
      pathData = `M ${centerX - halfSize} ${centerY - halfSize} L ${centerX + halfSize} ${centerY - halfSize} L ${centerX + halfSize} ${centerY + halfSize} L ${centerX - halfSize} ${centerY + halfSize} L ${centerX - halfSize} ${centerY - halfSize}`;
      break;
    }
    case 'rectangle': {
      pathData = `M ${shapeStart.x} ${shapeStart.y} L ${shapeEnd.x} ${shapeStart.y} L ${shapeEnd.x} ${shapeEnd.y} L ${shapeStart.x} ${shapeEnd.y} L ${shapeStart.x} ${shapeStart.y}`;
      break;
    }
    case 'circle': {
      const radius = Math.min(width, height) / 2;
      const kappa = 0.552284749831;
      pathData = `M ${centerX - radius} ${centerY} C ${centerX - radius} ${centerY - radius * kappa} ${centerX - radius * kappa} ${centerY - radius} ${centerX} ${centerY - radius} C ${centerX + radius * kappa} ${centerY - radius} ${centerX + radius} ${centerY - radius * kappa} ${centerX + radius} ${centerY} C ${centerX + radius} ${centerY + radius * kappa} ${centerX + radius * kappa} ${centerY + radius} ${centerX} ${centerY + radius} C ${centerX - radius * kappa} ${centerY + radius} ${centerX - radius} ${centerY + radius * kappa} ${centerX - radius} ${centerY}`;
      break;
    }
    case 'triangle': {
      pathData = `M ${centerX} ${shapeStart.y} L ${shapeEnd.x} ${shapeEnd.y} L ${shapeStart.x} ${shapeEnd.y} L ${centerX} ${shapeStart.y}`;
      break;
    }
  }

  return (
    <path
      d={pathData}
      stroke={previewColor}
      strokeWidth={1 / viewport.zoom}
      fill="none"
      strokeOpacity={0.7}
      strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
    />
  );
};