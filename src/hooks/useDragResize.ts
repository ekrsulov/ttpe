import { useState, useCallback, useEffect, useRef } from 'react';
import { clamp } from '../utils/coreHelpers';

export interface UseDragResizeOptions {
  onResize: (newValue: number) => void;
  onReset?: () => void;
  minValue: number;
  maxValue: number;
  /** Direction of resize: 'horizontal' or 'vertical' */
  direction?: 'horizontal' | 'vertical';
  /** For horizontal resize from right edge (like sidebar) */
  reverseHorizontal?: boolean;
  /** For vertical resize where dragging up increases value (like SelectPanel) */
  reverseVertical?: boolean;
  /** Initial value for calculating delta in reverse vertical mode */
  initialValue?: number;
}

export interface UseDragResizeResult {
  isDragging: boolean;
  handlePointerDown: (e: React.PointerEvent) => void;
  handleDoubleClick: (e: React.MouseEvent) => void;
}

/**
 * Hook for implementing drag-to-resize functionality.
 * Consolidates resize logic used in SidebarResizer and SelectPanel.
 * Uses pointer events for unified mouse and touch support.
 * 
 * @example
 * ```tsx
 * const { isDragging, handlePointerDown, handleDoubleClick } = useDragResize({
 *   onResize: (width) => setSidebarWidth(width),
 *   onReset: () => setSidebarWidth(DEFAULT_WIDTH),
 *   minValue: 260,
 *   maxValue: 600,
 *   direction: 'horizontal',
 *   reverseHorizontal: true, // For resizing from right edge
 * });
 * 
 * return (
 *   <div 
 *     onPointerDown={handlePointerDown}
 *     onDoubleClick={handleDoubleClick}
 *     style={{ cursor: isDragging ? 'ew-resize' : 'auto' }}
 *   />
 * );
 * ```
 */
export function useDragResize({
  onResize,
  onReset,
  minValue,
  maxValue,
  direction = 'horizontal',
  reverseHorizontal = false,
  reverseVertical = false,
  initialValue,
}: UseDragResizeOptions): UseDragResizeResult {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPositionRef = useRef(0);
  const dragStartValueRef = useRef(0);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    
    // Store starting position and value for delta calculation
    if (direction === 'horizontal') {
      dragStartPositionRef.current = clientX;
    } else {
      dragStartPositionRef.current = clientY;
    }
    
    if (initialValue !== undefined) {
      dragStartValueRef.current = initialValue;
    }
  }, [direction, initialValue]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  }, [startDrag]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onReset?.();
    },
    [onReset]
  );

  const calculateNewValue = useCallback((clientX: number, clientY: number): number => {
    let newValue: number;

    if (direction === 'horizontal') {
      // Horizontal resize
      if (reverseHorizontal) {
        // Calculate from right edge (e.g., sidebar from right)
        newValue = window.innerWidth - clientX;
      } else {
        // Calculate from left edge
        newValue = clientX;
      }
    } else {
      // Vertical resize
      if (reverseVertical) {
        // Calculate delta for reverse vertical (drag up = increase)
        const deltaY = dragStartPositionRef.current - clientY;
        newValue = dragStartValueRef.current + deltaY;
      } else {
        // Normal vertical (drag down = increase)
        newValue = clientY;
      }
    }

    // Constrain within min/max bounds
    return clamp(newValue, minValue, maxValue);
  }, [direction, reverseHorizontal, reverseVertical, minValue, maxValue]);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;
      const newValue = calculateNewValue(e.clientX, e.clientY);
      onResize(newValue);
    },
    [isDragging, calculateNewValue, onResize]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove global pointer listeners and prevent text selection during drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      document.addEventListener('pointercancel', handlePointerUp);
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.cursor = direction === 'horizontal' ? 'ew-resize' : 'ns-resize';
    } else {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, handlePointerMove, handlePointerUp, direction]);

  return {
    isDragging,
    handlePointerDown,
    handleDoubleClick,
  };
}
