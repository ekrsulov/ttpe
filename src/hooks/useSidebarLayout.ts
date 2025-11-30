import { useCanvasStore } from '../store/canvasStore';

/**
 * Hook to get effective sidebar width for layout calculations.
 * Consolidates the repeated pattern across TopActionBar, BottomActionBar,
 * VirtualShiftButton, and ExpandableToolPanel.
 * 
 * @deprecated Use useSidebarLayout().effectiveSidebarWidth instead for consistency.
 * @returns effectiveSidebarWidth - 0 when sidebar is not pinned, actual width when pinned
 */
export function useEffectiveSidebarWidth(): number {
  const sidebarWidth = useCanvasStore(state => state.sidebarWidth);
  const isSidebarPinned = useCanvasStore(state => state.isSidebarPinned);
  
  return isSidebarPinned ? sidebarWidth : 0;
}

/**
 * Primary hook for sidebar layout state.
 * Use this when you need sidebar dimensions or layout-related state.
 * 
 * For full sidebar state including actions, use useSidebarState() instead.
 */
export function useSidebarLayout() {
  const sidebarWidth = useCanvasStore(state => state.sidebarWidth);
  const isSidebarPinned = useCanvasStore(state => state.isSidebarPinned);
  const isSidebarOpen = useCanvasStore(state => state.isSidebarOpen);
  
  return {
    /** Raw sidebar width from store */
    sidebarWidth,
    /** Whether sidebar is pinned */
    isSidebarPinned,
    /** Whether sidebar drawer is open */
    isSidebarOpen,
    /** Effective width: sidebarWidth when pinned, 0 otherwise */
    effectiveSidebarWidth: isSidebarPinned ? sidebarWidth : 0,
  };
}
