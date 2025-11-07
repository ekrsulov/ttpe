import { useState, useEffect, useRef } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { CanvasElement } from '../types';

/**
 * Custom hook to get elements from store, but freeze updates during dragging.
 * 
 * This prevents re-renders of the SelectPanel when element positions change
 * during drag operations. The panel only updates:
 * 1. When elements are added/removed (not dragging)
 * 2. When dragging ends (to show final positions)
 * 
 * During the drag itself (pointerdown -> pointermove -> pointerup),
 * the elements array remains stable and does not trigger re-renders.
 */
export const useFrozenElementsDuringDrag = (): CanvasElement[] => {
  // Keep elements in state (this is what we return and controls re-renders)
  const [elements, setElements] = useState<CanvasElement[]>(() => 
    useCanvasStore.getState().elements
  );
  
  // Track dragging state internally without causing re-renders
  const isDraggingRef = useRef(false);
  
  // Single subscription to store that handles everything
  useEffect(() => {
    const unsubscribe = useCanvasStore.subscribe(
      (state) => {
        const isNowDragging = state.isDraggingElements;
        
        // Update dragging state
        isDraggingRef.current = isNowDragging;
        
        // Update elements only when not dragging
        if (!isNowDragging) {
          setElements(state.elements);
        }
      }
    );
    
    return unsubscribe;
  }, []);
  
  return elements;
};
