import { useRef, useCallback } from 'react';

interface DoubleTapState {
  time: number;
  x: number;
  y: number;
  elementId: string | null;
  subpathIndex?: number;
}

interface DoubleTapOptions {
  timeThreshold?: number; // milliseconds
  distanceThreshold?: number; // pixels
}

interface DoubleTapHandlers {
  handleElementTouchEnd: (elementId: string, event: React.TouchEvent<Element>) => boolean;
  handleSubpathTouchEnd: (elementId: string, subpathIndex: number, event: React.TouchEvent<Element>) => boolean;
  handleCanvasTouchEnd: (event: React.TouchEvent<SVGSVGElement>) => boolean;
}

/**
 * Hook to detect double tap gestures on elements, subpaths, and canvas
 * Returns true if a double tap was detected, false otherwise
 */
export const useDoubleTap = (options: DoubleTapOptions = {}): DoubleTapHandlers => {
  const {
    timeThreshold = 300,
    distanceThreshold = 30,
  } = options;

  const lastTapRef = useRef<DoubleTapState | null>(null);

  const handleElementTouchEnd = useCallback(
    (elementId: string, event: React.TouchEvent<Element>): boolean => {
      const now = Date.now();
      const touch = event.changedTouches[0];
      if (!touch) return false;

      const x = touch.clientX;
      const y = touch.clientY;

      // Check for double tap
      if (
        lastTapRef.current &&
        lastTapRef.current.elementId === elementId &&
        lastTapRef.current.subpathIndex === undefined &&
        now - lastTapRef.current.time < timeThreshold &&
        Math.abs(x - lastTapRef.current.x) < distanceThreshold &&
        Math.abs(y - lastTapRef.current.y) < distanceThreshold
      ) {
        // Double tap detected
        lastTapRef.current = null; // Reset to prevent triple tap
        return true;
      }

      // Single tap - record it
      lastTapRef.current = { time: now, x, y, elementId };
      return false;
    },
    [timeThreshold, distanceThreshold]
  );

  const handleSubpathTouchEnd = useCallback(
    (elementId: string, subpathIndex: number, event: React.TouchEvent<Element>): boolean => {
      const now = Date.now();
      const touch = event.changedTouches[0];
      if (!touch) return false;

      const x = touch.clientX;
      const y = touch.clientY;

      // Check for double tap on same subpath
      if (
        lastTapRef.current &&
        lastTapRef.current.elementId === elementId &&
        lastTapRef.current.subpathIndex === subpathIndex &&
        now - lastTapRef.current.time < timeThreshold &&
        Math.abs(x - lastTapRef.current.x) < distanceThreshold &&
        Math.abs(y - lastTapRef.current.y) < distanceThreshold
      ) {
        // Double tap detected on subpath
        lastTapRef.current = null; // Reset to prevent triple tap
        return true;
      }

      // Single tap on subpath - record it
      lastTapRef.current = { time: now, x, y, elementId, subpathIndex };
      return false;
    },
    [timeThreshold, distanceThreshold]
  );

  const handleCanvasTouchEnd = useCallback(
    (event: React.TouchEvent<SVGSVGElement>): boolean => {
      const now = Date.now();
      const touch = event.changedTouches[0];
      if (!touch) return false;

      const x = touch.clientX;
      const y = touch.clientY;

      // Check for double tap on empty space (no elementId)
      if (
        lastTapRef.current &&
        lastTapRef.current.elementId === null &&
        now - lastTapRef.current.time < timeThreshold &&
        Math.abs(x - lastTapRef.current.x) < distanceThreshold &&
        Math.abs(y - lastTapRef.current.y) < distanceThreshold
      ) {
        // Double tap detected on empty space
        lastTapRef.current = null; // Reset to prevent triple tap
        return true;
      }

      // Single tap on empty space - record it
      lastTapRef.current = { time: now, x, y, elementId: null };
      return false;
    },
    [timeThreshold, distanceThreshold]
  );

  return {
    handleElementTouchEnd,
    handleSubpathTouchEnd,
    handleCanvasTouchEnd,
  };
};
