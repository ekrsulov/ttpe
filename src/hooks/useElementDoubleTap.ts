import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

interface DoubleTapState {
  time: number;
  x: number;
  y: number;
  elementId: string | null;
}

interface UseElementDoubleTapOptions {
  svgRef: RefObject<SVGSVGElement | null>;
  onElementDoubleTap: (elementId: string) => void;
  timeThreshold?: number;
  distanceThreshold?: number;
}

/**
 * Hook to detect double tap on SVG path elements
 * Uses native DOM events to ensure reliable touch detection on SVG
 */
export const useElementDoubleTap = ({
  svgRef,
  onElementDoubleTap,
  timeThreshold = 300,
  distanceThreshold = 30,
}: UseElementDoubleTapOptions): void => {
  // Move lastTap state OUTSIDE of useEffect so it persists across remounts
  const lastTapRef = useRef<DoubleTapState | null>(null);
  const callbackRef = useRef(onElementDoubleTap);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onElementDoubleTap;
  }, [onElementDoubleTap]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const handleTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) {
        return;
      }

      // Only handle single-finger taps
      if (event.touches.length > 0) {
        return;
      }

      // Find the path element that was tapped
      const target = event.target as Element;
      if (target.tagName !== 'path') {
        return;
      }

      const elementId = target.getAttribute('data-element-id');
      if (!elementId) {
        return;
      }

      const now = Date.now();
      const x = touch.clientX;
      const y = touch.clientY;

      // Check for double tap
      if (
        lastTapRef.current &&
        lastTapRef.current.elementId === elementId &&
        now - lastTapRef.current.time < timeThreshold &&
        Math.abs(x - lastTapRef.current.x) < distanceThreshold &&
        Math.abs(y - lastTapRef.current.y) < distanceThreshold
      ) {
        // Double tap detected
        event.preventDefault();
        event.stopPropagation();
        lastTapRef.current = null; // Reset to prevent triple tap
        callbackRef.current(elementId);
      } else {
        // Single tap - record it
        lastTapRef.current = { time: now, x, y, elementId };
      }
    };

    // Add listener with capture phase to ensure we get it before other handlers
    svg.addEventListener('touchend', handleTouchEnd, { passive: false, capture: false });

    return () => {
      svg.removeEventListener('touchend', handleTouchEnd);
    };
  }, [svgRef, timeThreshold, distanceThreshold]); // Removed onElementDoubleTap from dependencies
};
