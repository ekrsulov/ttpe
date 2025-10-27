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
  handleDoubleClick: (e: React.MouseEvent) => void;
}

/**
 * Hook for implementing drag-to-resize functionality.
 * Consolidates resize logic used in SidebarResizer and SelectPanel.
 * 
 * @example
 * ```tsx
 * const { isDragging, handleMouseDown, handleDoubleClick } = useDragResize({
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    // Store starting position and value for delta calculation
    if (direction === 'horizontal') {
      dragStartPositionRef.current = e.clientX;
    } else {
      dragStartPositionRef.current = e.clientY;
    }
    
    if (initialValue !== undefined) {
      dragStartValueRef.current = initialValue;
    }
  }, [direction, initialValue]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onReset?.();
    },
    [onReset]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      let newValue: number;

      if (direction === 'horizontal') {
        // Horizontal resize
        if (reverseHorizontal) {
          // Calculate from right edge (e.g., sidebar from right)
          newValue = window.innerWidth - e.clientX;
        } else {
          // Calculate from left edge
          newValue = e.clientX;
        }
      } else {
        // Vertical resize
        if (reverseVertical) {
          // Calculate delta for reverse vertical (drag up = increase)
          const deltaY = dragStartPositionRef.current - e.clientY;
          newValue = dragStartValueRef.current + deltaY;
        } else {
          // Normal vertical (drag down = increase)
          newValue = e.clientY;
        }
      }

      // Constrain within min/max bounds
      const constrainedValue = Math.min(Math.max(newValue, minValue), maxValue);
      onResize(constrainedValue);
    },
    [isDragging, minValue, maxValue, onResize, direction, reverseHorizontal, reverseVertical]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove global mouse listeners and prevent text selection during drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.cursor = direction === 'horizontal' ? 'ew-resize' : 'ns-resize';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp, direction]);

  return {
    isDragging,
    handleMouseDown,
    handleDoubleClick,
  };
}
