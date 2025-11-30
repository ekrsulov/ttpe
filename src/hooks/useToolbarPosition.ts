import { useMemo } from 'react';

interface ToolbarPositionConfig {
  /** Left position for fixed centering */
  left: string;
  /** Right position when sidebar is pinned */
  right: string;
  /** Transform for centering */
  transform: string;
  /** Whether sidebar affects positioning */
  isSidebarPinned: boolean;
}

/**
 * Hook to calculate toolbar positioning based on sidebar width.
 * Centralizes the repeated positioning logic used across TopActionBar,
 * BottomActionBar, ExpandableToolPanel, and VirtualShiftButton.
 * 
 * @param sidebarWidth - Current sidebar width in pixels (0 when not pinned)
 * @returns Position configuration for toolbar components
 */
export function useToolbarPosition(sidebarWidth: number = 0): ToolbarPositionConfig {
  return useMemo(() => {
    const isSidebarPinned = sidebarWidth > 0;
    
    return {
      left: isSidebarPinned ? '0' : '50%',
      right: isSidebarPinned ? `${sidebarWidth}px` : 'auto',
      transform: isSidebarPinned ? 'none' : 'translateX(-50%)',
      isSidebarPinned,
    };
  }, [sidebarWidth]);
}
