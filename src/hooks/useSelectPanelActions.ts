import { useCanvasStore } from '../store/canvasStore';

/**
 * Shared hook for select panel actions.
 * Provides consistent store subscriptions for item and group components.
 */
export function useSelectPanelActions() {
  const toggleElementVisibility = useCanvasStore(state => state.toggleElementVisibility);
  const toggleElementLock = useCanvasStore(state => state.toggleElementLock);
  const selectElements = useCanvasStore(state => state.selectElements);
  const toggleGroupVisibility = useCanvasStore(state => state.toggleGroupVisibility);
  const toggleGroupLock = useCanvasStore(state => state.toggleGroupLock);

  return {
    // Element actions
    toggleElementVisibility,
    toggleElementLock,
    selectElement: (id: string) => selectElements([id]),
    
    // Group actions (aliased for consistency)
    toggleGroupVisibility,
    toggleGroupLock,
    selectGroup: (id: string) => selectElements([id]),
  };
}
