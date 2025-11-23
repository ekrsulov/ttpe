import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { CollaborationUser } from '../../types/collaboration';
import type { CanvasElement, PathData, Command } from '../../types';

/**
 * RemoteSelectionsOverlay displays selection rectangles from other collaborators
 */
export const RemoteSelectionsOverlay: React.FC = () => {
  const users = useCanvasStore((state) => state.collaboration?.users);
  const elements = useCanvasStore((state) => state.elements);

  if (!users || Object.keys(users).length === 0) return null;

  return (
    <g id="remote-selections">
      {(Object.values(users) as CollaborationUser[]).map((user) => {
        if (!user.selection || user.selection.length === 0) return null;

        // Find selected elements and draw rectangles around them
        const selectedElements = elements.filter((el) =>
          user.selection?.includes(el.id)
        );

        return (
          <g key={user.id}>
            {selectedElements.map((element) => {
              // Calculate bounding box (simplified - you'd use actual bounds calculation)
              const bounds = calculateElementBounds(element);
              if (!bounds) return null;

              return (
                <rect
                  key={`${user.id}-${element.id}`}
                  x={bounds.minX}
                  y={bounds.minY}
                  width={bounds.maxX - bounds.minX}
                  height={bounds.maxY - bounds.minY}
                  fill="none"
                  stroke={user.color}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  opacity={0.7}
                  pointerEvents="none"
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
};

// Helper to calculate element bounds (simplified version)
function calculateElementBounds(element: CanvasElement): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  // This is a simplified version - you should use the actual bounds calculation
  // from your existing utilities
  if (element.type === 'path' && element.data) {
    const pathData = element.data as PathData;
    if (!pathData.subPaths) return null;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    pathData.subPaths.forEach((subPath) => {
      subPath.forEach((cmd: Command) => {
        if (cmd.type !== 'Z') {
          const pos = 'position' in cmd ? cmd.position : null;
          if (pos) {
            minX = Math.min(minX, pos.x);
            maxX = Math.max(maxX, pos.x);
            minY = Math.min(minY, pos.y);
            maxY = Math.max(maxY, pos.y);
          }
          if (cmd.type === 'C') {
            minX = Math.min(minX, cmd.controlPoint1.x, cmd.controlPoint2.x);
            maxX = Math.max(maxX, cmd.controlPoint1.x, cmd.controlPoint2.x);
            minY = Math.min(minY, cmd.controlPoint1.y, cmd.controlPoint2.y);
            maxY = Math.max(maxY, cmd.controlPoint1.y, cmd.controlPoint2.y);
          }
        }
      });
    });

    if (minX !== Infinity) {
      return { minX, minY, maxX, maxY };
    }
  }

  return null;
}
