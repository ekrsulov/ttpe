import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from '../../utils';
import { MIN_ZOOM, MAX_ZOOM } from '../../store/slices/features/viewportSlice';

interface TouchInfo {
  id: number;
  x: number;
  y: number;
}

interface GestureState {
  touches: TouchInfo[];
  initialDistance: number | null;
  initialZoom: number;
  initialPanX: number;
  initialPanY: number;
  initialMidpoint: { x: number; y: number } | null;
  isGestureActive: boolean;
}

const getTouchInfo = (touch: Touch): TouchInfo => ({
  id: touch.identifier,
  x: touch.clientX,
  y: touch.clientY,
});

const calculateDistance = (touch1: TouchInfo, touch2: TouchInfo): number => {
  const dx = touch2.x - touch1.x;
  const dy = touch2.y - touch1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const calculateMidpoint = (touch1: TouchInfo, touch2: TouchInfo): { x: number; y: number } => ({
  x: (touch1.x + touch2.x) / 2,
  y: (touch1.y + touch2.y) / 2,
});

/**
 * Hook to handle mobile touch gestures for zoom and pan on the canvas
 * Supports:
 * - Pinch-to-zoom with two fingers
 * - Two-finger pan
 */
export const useMobileTouchGestures = (svgRef: RefObject<SVGSVGElement | null>): void => {
  const gestureStateRef = useRef<GestureState>({
    touches: [],
    initialDistance: null,
    initialZoom: 1,
    initialPanX: 0,
    initialPanY: 0,
    initialMidpoint: null,
    isGestureActive: false,
  });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const handleTouchStart = (event: TouchEvent) => {
      // Only handle multi-touch gestures (2 or more fingers)
      if (event.touches.length < 2) {
        gestureStateRef.current.touches = [];
        gestureStateRef.current.initialDistance = null;
        gestureStateRef.current.initialMidpoint = null;
        gestureStateRef.current.isGestureActive = false;
        return;
      }

      // Prevent default behavior for multi-touch
      event.preventDefault();
      event.stopPropagation();

      const touch1 = getTouchInfo(event.touches[0]);
      const touch2 = getTouchInfo(event.touches[1]);

      const distance = calculateDistance(touch1, touch2);
      const midpoint = calculateMidpoint(touch1, touch2);

      const state = useCanvasStore.getState();
      const { zoom, panX, panY } = state.viewport;

      gestureStateRef.current = {
        touches: [touch1, touch2],
        initialDistance: distance,
        initialZoom: zoom,
        initialPanX: panX,
        initialPanY: panY,
        initialMidpoint: midpoint,
        isGestureActive: true,
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      // Only handle multi-touch gestures
      if (event.touches.length < 2 || !gestureStateRef.current.initialDistance) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const touch1 = getTouchInfo(event.touches[0]);
      const touch2 = getTouchInfo(event.touches[1]);

      const currentDistance = calculateDistance(touch1, touch2);
      const currentMidpoint = calculateMidpoint(touch1, touch2);

      const state = gestureStateRef.current;
      
      if (!state.initialMidpoint || !state.initialDistance) {
        return;
      }

      // Calculate zoom based on pinch distance
      const zoomFactor = currentDistance / state.initialDistance;
      let newZoom = state.initialZoom * zoomFactor;

      // Apply zoom limits
      newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

      // Calculate pan based on finger movement
      // We want to keep the content under the midpoint stable
      const rect = svg.getBoundingClientRect();
      const initialMidpointRelative = {
        x: state.initialMidpoint.x - rect.left,
        y: state.initialMidpoint.y - rect.top,
      };
      const currentMidpointRelative = {
        x: currentMidpoint.x - rect.left,
        y: currentMidpoint.y - rect.top,
      };

      // Calculate zoom ratio
      const zoomRatio = newZoom / state.initialZoom;

      // Adjust pan to keep the midpoint stable during zoom
      let newPanX = initialMidpointRelative.x - (initialMidpointRelative.x - state.initialPanX) * zoomRatio;
      let newPanY = initialMidpointRelative.y - (initialMidpointRelative.y - state.initialPanY) * zoomRatio;

      // Add the delta from finger movement
      const midpointDeltaX = currentMidpointRelative.x - initialMidpointRelative.x;
      const midpointDeltaY = currentMidpointRelative.y - initialMidpointRelative.y;

      newPanX += midpointDeltaX;
      newPanY += midpointDeltaY;

      // Update viewport
      useCanvasStore.setState((currentState) => ({
        viewport: {
          ...currentState.viewport,
          zoom: formatToPrecision(newZoom, PATH_DECIMAL_PRECISION),
          panX: formatToPrecision(newPanX, PATH_DECIMAL_PRECISION),
          panY: formatToPrecision(newPanY, PATH_DECIMAL_PRECISION),
        },
      }));
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const wasGestureActive = gestureStateRef.current.isGestureActive;
      
      // Reset gesture state when fingers are lifted
      if (event.touches.length < 2) {
        gestureStateRef.current.touches = [];
        gestureStateRef.current.initialDistance = null;
        gestureStateRef.current.initialMidpoint = null;
        gestureStateRef.current.isGestureActive = false;
        
        // IMPORTANT: Only prevent default if a multi-touch gesture was active
        // This allows single-tap events (including double-tap detection) to work normally
        if (wasGestureActive) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    const handleTouchCancel = () => {
      // Reset gesture state on cancel
      gestureStateRef.current.touches = [];
      gestureStateRef.current.initialDistance = null;
      gestureStateRef.current.initialMidpoint = null;
      gestureStateRef.current.isGestureActive = false;
    };

    // Add event listeners
    // Use passive: false to allow preventDefault for multi-touch gestures
    // Touch events handle pinch-to-zoom and two-finger pan
    svg.addEventListener('touchstart', handleTouchStart, { passive: false });
    svg.addEventListener('touchmove', handleTouchMove, { passive: false });
    svg.addEventListener('touchend', handleTouchEnd, { passive: false });
    svg.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return () => {
      svg.removeEventListener('touchstart', handleTouchStart);
      svg.removeEventListener('touchmove', handleTouchMove);
      svg.removeEventListener('touchend', handleTouchEnd);
      svg.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [svgRef]);
};
