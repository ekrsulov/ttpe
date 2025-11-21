import { createContext, useContext } from 'react';
import type {
  SelectedCommand
} from '../types/panel';

/**
 * Context for EditPanel-related state and actions.
 * Eliminates prop tunneling through SidebarContent → SidebarPanels → EditPanel
 */
export interface EditPanelContextValue {
  selectedCommands: SelectedCommand[];
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
}

export const EditPanelContext = createContext<EditPanelContextValue | null>(null);

/**
 * Hook to access EditPanel context.
 * Must be used within EditPanelContext.Provider
 */
export function useEditPanelContext(): EditPanelContextValue {
  const context = useContext(EditPanelContext);
  if (!context) {
    throw new Error('useEditPanelContext must be used within EditPanelContext.Provider');
  }
  return context;
}
