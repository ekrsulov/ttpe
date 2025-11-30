import { useCanvasStore } from '../store/canvasStore';

/**
 * Hook to get effective sidebar width for layout calculations.
 * Consolidates the repeated pattern across TopActionBar, BottomActionBar,
 * VirtualShiftButton, and ExpandableToolPanel.
 * 
 * @returns effectiveSidebarWidth - 0 when sidebar is not pinned, actual width when pinned
 */
export function useEffectiveSidebarWidth(): number {
  const sidebarWidth = useCanvasStore(state => state.sidebarWidth);
  const isSidebarPinned = useCanvasStore(state => state.isSidebarPinned);
  
  return isSidebarPinned ? sidebarWidth : 0;
}

/**
 * Hook to get sidebar-related layout state.
 * Use this when you need both the width and pinned state.
 */
export function useSidebarLayout() {
  const sidebarWidth = useCanvasStore(state => state.sidebarWidth);
  const isSidebarPinned = useCanvasStore(state => state.isSidebarPinned);
  const isSidebarOpen = useCanvasStore(state => state.isSidebarOpen);
  
  return {
    sidebarWidth,
    isSidebarPinned,
    isSidebarOpen,
    effectiveSidebarWidth: isSidebarPinned ? sidebarWidth : 0,
  };
}
