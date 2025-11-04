import { useCanvasStore } from '../store/canvasStore';

/**
 * Shared hook for select panel actions.
 * Provides consistent store subscriptions for item and group components.
 */
export function useSelectPanelActions() {
  const toggleElementVisibility = useCanvasStore(state => state.toggleElementVisibility);
  const toggleElementLock = useCanvasStore(state => state.toggleElementLock);
  const selectElement = useCanvasStore(state => state.selectElement);
  const toggleGroupVisibility = useCanvasStore(state => state.toggleGroupVisibility);
  const toggleGroupLock = useCanvasStore(state => state.toggleGroupLock);

  return {
    // Element actions
    toggleElementVisibility,
    toggleElementLock,
    selectElement: (id: string, multiSelect?: boolean) => selectElement(id, multiSelect),
    
    // Group actions (aliased for consistency)
    toggleGroupVisibility,
    toggleGroupLock,
    selectGroup: (id: string, multiSelect?: boolean) => selectElement(id, multiSelect),
  };
}
