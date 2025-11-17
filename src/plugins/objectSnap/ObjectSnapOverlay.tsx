import React from 'react';
import type { SnapPoint } from './slice';
import type { Viewport } from '../../types';
import { SnapPointVisualization } from '../../overlays/SnapPointOverlay';

interface ObjectSnapOverlayProps {
  objectSnap: {
    enabled: boolean;
    currentSnapPoint: SnapPoint | null;
    availableSnapPoints: SnapPoint[];
    snapThreshold: number;
    showSnapPoints: boolean;
    snapPointsOpacity: number;
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
  
  return (
    <g data-testid="object-snap-overlay">
      <SnapPointVisualization
        allSnapPoints={objectSnap.availableSnapPoints}
        activeSnapPoint={objectSnap.currentSnapPoint}
        viewport={viewport}
        showAllPoints={objectSnap.showSnapPoints}
        allPointsOpacity={objectSnap.snapPointsOpacity / 100}
      />
    </g>
  );
};
