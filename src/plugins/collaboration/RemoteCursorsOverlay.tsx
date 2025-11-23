import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { CollaborationUser } from '../../types/collaboration';

/**
 * RemoteCursorsOverlay displays cursors from other collaborators
 */
export const RemoteCursorsOverlay: React.FC = () => {
  const users = useCanvasStore((state) => state.collaboration?.users);
  const viewport = useCanvasStore((state) => state.viewport);

  if (!users || Object.keys(users).length === 0) return null;

  return (
    <div 
      style={{ 
        pointerEvents: 'none', 
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {(Object.values(users) as CollaborationUser[]).map((user) => {
        if (!user.cursor) return null;

        // Convert canvas coordinates to screen coordinates
        const screenX = user.cursor.x * viewport.zoom + viewport.panX;
        const screenY = user.cursor.y * viewport.zoom + viewport.panY;

        return (
          <div
            key={user.id}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY,
              transform: 'translate(-2px, -2px)',
              zIndex: 10000,
            }}
          >
            {/* Cursor pointer */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.5 3L18.5 12L12 14L9 20.5L5.5 3Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>

            {/* User name label */}
            <div
              style={{
                position: 'absolute',
                left: '20px',
                top: '20px',
                backgroundColor: user.color,
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {user.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};
