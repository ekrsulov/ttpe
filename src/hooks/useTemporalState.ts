import { useState, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';

/**
 * Custom hook to subscribe to temporal state changes (undo/redo history).
 * Returns the temporal state including undo, redo functions and history lengths.
 */
export function useTemporalState() {
  const [temporalState, setTemporalState] = useState(() => useCanvasStore.temporal.getState());

  useEffect(() => {
    const unsubscribe = useCanvasStore.temporal.subscribe(setTemporalState);
    return unsubscribe;
  }, []);

  return temporalState;
}
