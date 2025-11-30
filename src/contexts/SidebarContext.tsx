import { createContext, useContext } from 'react';

/**
 * Context for Sidebar-related state and actions.
 * Eliminates prop tunneling through Sidebar → SidebarContent → child components
 */
export interface SidebarContextValue {
  // State
  activePlugin: string | null;
  showFilePanel: boolean;
  showSettingsPanel: boolean;
  isPinned: boolean;
  isDesktop: boolean | undefined;
  isArrangeExpanded: boolean;

  // Actions
  setMode: (mode: string) => void;
  onToolClick: (toolName: string) => void;
  onTogglePin: () => void;
  setIsArrangeExpanded: (value: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

/**
 * Hook to access Sidebar context.
 * Must be used within SidebarContext.Provider
 */
export function useSidebarContext(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used within SidebarContext.Provider');
  }
  return context;
}
