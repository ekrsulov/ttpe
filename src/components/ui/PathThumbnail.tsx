import React from 'react';
import { Box } from '@chakra-ui/react';
import type { Command, CanvasElement, PathData } from '../../types';
import { commandsToString } from '../../utils/path';

interface PathThumbnailProps {
  commands: Command[];
  size?: number;
  element?: CanvasElement;
}

/**
 * Renders a small SVG thumbnail preview of a path
 */
export const PathThumbnail: React.FC<PathThumbnailProps> = ({ 
  commands, 
  size = 40,
  element
}) => {
  // Calculate bounding box of the path
  const getBoundingBox = (cmds: Command[]) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    cmds.forEach(cmd => {
      const points: number[] = [];
      
      switch (cmd.type) {
        case 'M':
        case 'L':
          points.push(cmd.position.x, cmd.position.y);
          break;
        case 'C':
          points.push(
            cmd.controlPoint1.x, cmd.controlPoint1.y,
            cmd.controlPoint2.x, cmd.controlPoint2.y,
            cmd.position.x, cmd.position.y
          );
          break;
        case 'Z':
          // Z command doesn't add new points
          break;
      }

      for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        const y = points[i + 1];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    });

    return { minX, minY, maxX, maxY };
  };

  if (commands.length === 0) {
    return (
      <Box 
        width={`${size}px`} 
        height={`${size}px`} 
        bg="gray.100" 
        borderRadius="sm"
      />
    );
  }

  const bbox = getBoundingBox(commands);
  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;

  // Add padding (10% of size)
  const padding = Math.max(width, height) * 0.1;
  const viewBoxWidth = width + padding * 2;
  const viewBoxHeight = height + padding * 2;
  const viewBoxX = bbox.minX - padding;
  const viewBoxY = bbox.minY - padding;

  const pathString = commandsToString(commands);

  // Get fill and stroke from element if available
  const fill = element?.type === 'path' 
    ? (element.data as PathData).fillColor || 'none'
    : 'none';
  const fillOpacity = element?.type === 'path'
    ? (element.data as PathData).fillOpacity || 1
    : 1;
  const strokeColor = element?.type === 'path'
    ? (element.data as PathData).strokeColor
    : '#000000';
  const stroke = strokeColor === 'none' ? '#000000' : strokeColor;

  // Use fixed stroke width for thumbnail
  const thumbnailStrokeWidth = 1;

  return (
    <Box 
      width={`${size}px`} 
      height={`${size}px`} 
      bg="white" 
      borderRadius="sm"
      border="1px solid"
      borderColor="gray.200"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
    >
      <svg
        width={size}
        height={size}
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={pathString}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={thumbnailStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </Box>
  );
};
