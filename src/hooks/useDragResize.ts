import { useState, useCallback, useEffect, useRef } from 'react';

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
  handleMouseDown: (e: React.MouseEvent) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleDoubleClick: (e: React.MouseEvent) => void;
}

/**
 * Hook for implementing drag-to-resize functionality.
 * Consolidates resize logic used in SidebarResizer and SelectPanel.
 * Supports both mouse and touch events for mobile compatibility.
 * 
 * @example
 * ```tsx
 * const { isDragging, handleMouseDown, handleTouchStart, handleDoubleClick } = useDragResize({
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
 *     onMouseDown={handleMouseDown}
 *     onTouchStart={handleTouchStart}
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  }, [startDrag]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
      startDrag(touch.clientX, touch.clientY);
    }
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
    return Math.min(Math.max(newValue, minValue), maxValue);
  }, [direction, reverseHorizontal, reverseVertical, minValue, maxValue]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const newValue = calculateNewValue(e.clientX, e.clientY);
      onResize(newValue);
    },
    [isDragging, calculateNewValue, onResize]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      if (touch) {
        const newValue = calculateNewValue(touch.clientX, touch.clientY);
        onResize(newValue);
      }
    },
    [isDragging, calculateNewValue, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove global mouse and touch listeners and prevent text selection during drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.cursor = direction === 'horizontal' ? 'ew-resize' : 'ns-resize';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd, direction]);

  return {
    isDragging,
    handleMouseDown,
    handleTouchStart,
    handleDoubleClick,
  };
}
