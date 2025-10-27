import { useRef, useCallback } from 'react';

interface DoubleTapState {
  lastTapTime: number;
  lastTapX: number;
  lastTapY: number;
  tapCount: number;
}

interface UseDoubleTapOptions {
  threshold?: number; // Time threshold in ms (default: 300)
  distanceThreshold?: number; // Distance threshold in pixels (default: 30)
  onDoubleTap?: (event: React.TouchEvent) => void;
}

/**
 * Hook to detect double-tap gestures on touch devices
 * Calls onDoubleTap when a double-tap is detected within the time and distance thresholds
 */
export const useDoubleTap = (options: UseDoubleTapOptions = {}) => {
  const { threshold = 300, distanceThreshold = 30, onDoubleTap } = options;

  const tapStateRef = useRef<DoubleTapState>({
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
    tapCount: 0,
  });

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      const now = Date.now();
      const touch = event.changedTouches[0];

      if (!touch) return;

      const { clientX, clientY } = touch;
      const { lastTapTime, lastTapX, lastTapY, tapCount } = tapStateRef.current;

      const timeDiff = now - lastTapTime;
      const distance = Math.sqrt(
        Math.pow(clientX - lastTapX, 2) + Math.pow(clientY - lastTapY, 2)
      );

      if (timeDiff < threshold && distance < distanceThreshold && tapCount === 1) {
        // Double tap detected
        event.preventDefault();
        onDoubleTap?.(event);
        tapStateRef.current = {
          lastTapTime: 0,
          lastTapX: 0,
          lastTapY: 0,
          tapCount: 0,
        };
      } else {
        // Single tap or first tap of potential double tap
        tapStateRef.current = {
          lastTapTime: now,
          lastTapX: clientX,
          lastTapY: clientY,
          tapCount: 1,
        };
      }
    },
    [threshold, distanceThreshold, onDoubleTap]
  );

  return {
    handleTouchEnd,
  };
};