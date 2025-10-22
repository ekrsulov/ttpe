import { useState, useEffect } from 'react';

export interface CanvasSize {
  width: number;
  height: number;
}

export interface UseDynamicCanvasSizeOptions {
  /**
   * Optional window provider for testing purposes.
   * Defaults to the global window object.
   */
  windowProvider?: Window & typeof globalThis;
}

/**
 * Hook that manages dynamic canvas size that updates with viewport changes.
 * Handles Safari toolbar show/hide and other viewport changes.
 * 
 * @param options - Optional configuration
 * @returns Current canvas size
 */
export function useDynamicCanvasSize(
  options?: UseDynamicCanvasSizeOptions
): CanvasSize {
  const win = options?.windowProvider ?? window;

  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: win.innerWidth,
    height: win.innerHeight,
  });

  useEffect(() => {
    const updateCanvasSize = () => {
      // Use visualViewport if available (better for mobile Safari)
      const width = win.visualViewport?.width ?? win.innerWidth;
      const height = win.visualViewport?.height ?? win.innerHeight;
      setCanvasSize({ width, height });
    };

    // Listen to both resize and visualViewport changes
    win.addEventListener('resize', updateCanvasSize);
    win.visualViewport?.addEventListener('resize', updateCanvasSize);
    win.visualViewport?.addEventListener('scroll', updateCanvasSize);

    return () => {
      win.removeEventListener('resize', updateCanvasSize);
      win.visualViewport?.removeEventListener('resize', updateCanvasSize);
      win.visualViewport?.removeEventListener('scroll', updateCanvasSize);
    };
  }, [win]);

  return canvasSize;
}
