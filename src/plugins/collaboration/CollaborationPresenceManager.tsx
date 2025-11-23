import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { CollaborationManager } from './CollaborationManager';

/**
 * Global component that manages cursor and selection tracking
 * for collaboration, independent of UI panel visibility.
 * 
 * This runs whenever a collaboration session is active.
 */
export const CollaborationPresenceManager: React.FC<{
  collaborationManager: CollaborationManager | null;
}> = ({ collaborationManager }) => {
  const isConnected = useCanvasStore((state) => state.collaboration?.isConnected);
  const viewport = useCanvasStore((state) => state.viewport);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const lastUpdateTime = useRef(0);
  const throttleMs = 50; // Update cursor position every 50ms max

  // Track cursor movements
  useEffect(() => {
    if (!collaborationManager || !isConnected) return;

    const handleMouseMove = (event: MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdateTime.current < throttleMs) return;
      lastUpdateTime.current = now;

      // Get canvas element
      const canvas = document.querySelector('svg[data-canvas="true"]');
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      
      // Convert screen coordinates to canvas coordinates
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      
      const canvasX = (screenX - viewport.panX) / viewport.zoom;
      const canvasY = (screenY - viewport.panY) / viewport.zoom;

      collaborationManager.updateCursor(canvasX, canvasY);
    };

    // Add listener to document to capture all mouse movements
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [collaborationManager, isConnected, viewport.zoom, viewport.panX, viewport.panY]);

  // Sync selection changes
  useEffect(() => {
    if (collaborationManager && isConnected && selectedIds) {
      collaborationManager.updateSelection(selectedIds);
    }
  }, [collaborationManager, selectedIds, isConnected]);

  // This component doesn't render anything
  return null;
};
