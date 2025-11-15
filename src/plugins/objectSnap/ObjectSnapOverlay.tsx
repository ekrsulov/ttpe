import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import type { SnapPoint } from './slice';
import type { Viewport } from '../../types';

interface ObjectSnapOverlayProps {
  objectSnap: {
    enabled: boolean;
    currentSnapPoint: SnapPoint | null;
    availableSnapPoints: SnapPoint[];
    snapThreshold: number;
  };
  viewport: Viewport;
  activePlugin: string;
  editingPoint: {
    isDragging: boolean;
  } | null;
  draggingSelection: {
    isDragging: boolean;
  } | null;
}

export const ObjectSnapOverlay: React.FC<ObjectSnapOverlayProps> = ({
  objectSnap,
  viewport,
  activePlugin,
  editingPoint,
  draggingSelection,
}) => {
  // Get theme-aware colors - all snap points use black/white based on theme
  const snapPointColor = useColorModeValue('#000000', '#ffffff'); // black in light, white in dark
  const activeSnapColor = useColorModeValue('#000000', '#ffffff'); // black in light, white in dark
  const snapPointStroke = useColorModeValue('#ffffff', '#1f2937'); // white : gray.800
  
  // Only show in edit mode when dragging
  if (activePlugin !== 'edit') {
    return null;
  }
  
  if (!objectSnap?.enabled) {
    return null;
  }
  
  const isDragging = editingPoint?.isDragging || draggingSelection?.isDragging;
  if (!isDragging) {
    return null;
  }
  
  const { zoom } = viewport;
  const snapPointRadius = 6 / zoom; // Increased from 4 for better visibility
  const activeSnapRadius = 10 / zoom; // Increased from 6 for better visibility
  const strokeWidth = 2 / zoom; // Increased from 1.5 for better visibility
  
  return (
    <g data-testid="object-snap-overlay">
      {/* Render all available snap points */}
      {objectSnap.availableSnapPoints?.map((point, index) => {
        // Skip the currently active snap point (will be rendered separately)
        if (objectSnap.currentSnapPoint && 
            point.x === objectSnap.currentSnapPoint.x && 
            point.y === objectSnap.currentSnapPoint.y) {
          return null;
        }

        if (point.type === 'midpoint') {
          // Render midpoints as triangles
          const size = snapPointRadius * 1.5;
          const height = size * Math.sqrt(3) / 2;
          return (
            <polygon
              key={`snap-${index}`}
              points={`${point.x},${point.y - height/1.5} ${point.x - size/2},${point.y + height/3} ${point.x + size/2},${point.y + height/3}`}
              fill={snapPointColor}
              stroke={snapPointStroke}
              strokeWidth={strokeWidth}
              opacity={0.5}
              pointerEvents="none"
            />
          );
        }

        // Render endpoints as circles (control points removed)
        return (
          <circle
            key={`snap-${index}`}
            cx={point.x}
            cy={point.y}
            r={snapPointRadius}
            fill={snapPointColor}
            stroke={snapPointStroke}
            strokeWidth={strokeWidth}
            opacity={0.5}
            pointerEvents="none"
          />
        );
      })}
      
      {/* Highlight the active snap point */}
      {objectSnap.currentSnapPoint && (
        <g>
          {/* Outer glow ring */}
          <circle
            cx={objectSnap.currentSnapPoint.x}
            cy={objectSnap.currentSnapPoint.y}
            r={activeSnapRadius * 1.8}
            fill="transparent"
            stroke={activeSnapColor}
            strokeWidth={strokeWidth * 0.5}
            opacity={0.3}
            pointerEvents="none"
          />
          
          {/* Main snap indicator */}
          <circle
            cx={objectSnap.currentSnapPoint.x}
            cy={objectSnap.currentSnapPoint.y}
            r={activeSnapRadius}
            fill={activeSnapColor}
            stroke={snapPointStroke}
            strokeWidth={strokeWidth}
            opacity={0.9}
            pointerEvents="none"
          />
          
          {/* Inner dot for better visibility */}
          <circle
            cx={objectSnap.currentSnapPoint.x}
            cy={objectSnap.currentSnapPoint.y}
            r={activeSnapRadius * 0.4}
            fill={snapPointStroke}
            opacity={0.8}
            pointerEvents="none"
          />
          
          {/* Crosshair for precision */}
          <g opacity={0.7}>
            <line
              x1={objectSnap.currentSnapPoint.x - activeSnapRadius * 2.5}
              y1={objectSnap.currentSnapPoint.y}
              x2={objectSnap.currentSnapPoint.x + activeSnapRadius * 2.5}
              y2={objectSnap.currentSnapPoint.y}
              stroke={activeSnapColor}
              strokeWidth={strokeWidth * 0.5}
              pointerEvents="none"
            />
            <line
              x1={objectSnap.currentSnapPoint.x}
              y1={objectSnap.currentSnapPoint.y - activeSnapRadius * 2.5}
              x2={objectSnap.currentSnapPoint.x}
              y2={objectSnap.currentSnapPoint.y + activeSnapRadius * 2.5}
              stroke={activeSnapColor}
              strokeWidth={strokeWidth * 0.5}
              pointerEvents="none"
            />
          </g>
        </g>
      )}
    </g>
  );
};
