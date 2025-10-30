import { createContext, useContext } from 'react';
import type { 
  SmoothBrush, 
  PathSimplification, 
  PathRounding, 
  SelectedCommand 
} from '../sidebar/components/panelConfig';

/**
 * Context for EditPanel-related state and actions.
 * Eliminates prop tunneling through SidebarContent → SidebarPanels → EditPanel
 */
export interface EditPanelContextValue {
  smoothBrush: SmoothBrush;
  addPointMode?: {
    isActive: boolean;
  };
  pathSimplification: PathSimplification;
  pathRounding: PathRounding;
  selectedCommands: SelectedCommand[];
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
  updateSmoothBrush: (config: Partial<SmoothBrush>) => void;
  updatePathSimplification: (config: Partial<PathSimplification>) => void;
  updatePathRounding: (config: Partial<PathRounding>) => void;
  applySmoothBrush: () => void;
  applyPathSimplification: () => void;
  applyPathRounding: () => void;
  activateSmoothBrush: () => void;
  deactivateSmoothBrush: () => void;
  resetSmoothBrush: () => void;
  activateAddPointMode?: () => void;
  deactivateAddPointMode?: () => void;
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
