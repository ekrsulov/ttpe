import { useCanvasStore } from '../store/canvasStore';
import type { PathData } from '../types';

export function getSelectedPathProperty<T extends keyof PathData>(
  property: T,
  fallbackValue: PathData[T]
): PathData[T] {
  const elements = useCanvasStore.getState().getSelectedElements();
  const pathElements = elements.filter(el => el.type === 'path');

  if (pathElements.length > 0) {
    return pathElements[0].data[property];
  }

  return fallbackValue;
}

// Hook version that reacts to changes in selected elements
export function useSelectedPathProperty<T extends keyof PathData>(
  property: T,
  fallbackValue: PathData[T]
): PathData[T] {
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const elements = useCanvasStore(state => state.elements);
  
  const pathElements = elements.filter(el => selectedIds.includes(el.id) && el.type === 'path');

  if (pathElements.length > 0) {
    return (pathElements[0].data as PathData)[property];
  }

  return fallbackValue;
}