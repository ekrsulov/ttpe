import { useState, useEffect, useRef, useMemo } from 'react';

interface UseVirtualListOptions {
  /** Total number of items in the list */
  itemCount: number;
  /** Height of each item in pixels */
  itemHeight: number;
  /** Height of the scrollable container in pixels */
  containerHeight: number;
  /** Number of items to render above and below the visible area (buffer) */
  overscan?: number;
}

interface VirtualListResult {
  /** Index of the first visible item */
  startIndex: number;
  /** Index of the last visible item */
  endIndex: number;
  /** Total height of the virtual list */
  totalHeight: number;
  /** Offset from the top for positioning the visible items */
  offsetY: number;
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Array of visible item indices */
  visibleIndices: number[];
}

/**
 * Hook for virtualizing a list to only render visible items
 * Improves performance for large lists by only rendering what's in view
 */
export const useVirtualList = ({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 3,
}: UseVirtualListOptions): VirtualListResult => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const { startIndex, endIndex, offsetY, visibleIndices } = useMemo(() => {
    // Calculate which items are visible
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    
    // Add overscan (buffer items above and below)
    const startWithOverscan = Math.max(0, start - overscan);
    const endWithOverscan = Math.min(itemCount - 1, start + visibleCount + overscan);
    
    // Calculate offset for positioning
    const offset = startWithOverscan * itemHeight;
    
    // Create array of visible indices
    const indices: number[] = [];
    for (let i = startWithOverscan; i <= endWithOverscan; i++) {
      indices.push(i);
    }
    
    return {
      startIndex: startWithOverscan,
      endIndex: endWithOverscan,
      offsetY: offset,
      visibleIndices: indices,
    };
  }, [scrollTop, itemCount, itemHeight, containerHeight, overscan]);

  return {
    startIndex,
    endIndex,
    totalHeight: itemCount * itemHeight,
    offsetY,
    containerRef,
    visibleIndices,
  };
};
