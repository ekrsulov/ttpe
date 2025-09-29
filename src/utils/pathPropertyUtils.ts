import { useCanvasStore } from '../store/canvasStore';
import type { PathData, CanvasElement } from '../types';

export function getSelectedPathProperty<T extends keyof PathData>(
  property: T,
  fallbackValue: PathData[T],
  selectedElements?: CanvasElement[]
): PathData[T] {
  const elements = selectedElements || useCanvasStore.getState().getSelectedElements();
  const pathElements = elements.filter(el => el.type === 'path');

  if (pathElements.length > 0) {
    return pathElements[0].data[property];
  }

  return fallbackValue;
}