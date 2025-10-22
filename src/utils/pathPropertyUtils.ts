import { useCanvasStore } from '../store/canvasStore';
import type { PathData } from '../types';

// Hook version that reacts to changes in selected elements
// Optimized: The selector extracts only the specific property value (a primitive or reference)
// Zustand will only trigger a re-render if this specific value changes (using Object.is comparison)
// This prevents re-renders when unrelated properties (like x, y, rotation, scaleX, etc.) change
export function useSelectedPathProperty<T extends keyof PathData>(
  property: T,
  fallbackValue: PathData[T]
): PathData[T] {
  // Single selector that accesses selectedIds and elements in one go
  // This way we only re-render if the PROPERTY VALUE changes, not if selectedIds or element positions change
  const propertyValue = useCanvasStore((state) => {
    const selectedIds = state.selectedIds;
    
    if (selectedIds.length === 0) {
      return fallbackValue;
    }
    
    const pathElements = state.elements.filter(
      el => selectedIds.includes(el.id) && el.type === 'path'
    );
    
    if (pathElements.length > 0) {
      return (pathElements[0].data as PathData)[property];
    }
    
    return fallbackValue;
  });

  return propertyValue;
}