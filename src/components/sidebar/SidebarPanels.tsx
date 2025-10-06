import React, { Suspense, useMemo } from 'react';
import { Box } from '@chakra-ui/react';
import { ConditionalPanel } from '../ui/ConditionalPanel';
import { useCanvasStore } from '../../store/canvasStore';
import { 
  PANEL_CONFIGS, 
  type SmoothBrush, 
  type PathSimplification, 
  type PathRounding, 
  type SelectedCommand,
  type PanelComponentProps 
} from './panelConfig';

interface SidebarPanelsProps {
  activePlugin: string | null;
  showFilePanel: boolean;
  showSettingsPanel: boolean;
  // EditPanel props
  smoothBrush: SmoothBrush;
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
}

/**
 * Main panels section of the sidebar with conditional rendering
 * Uses a data-driven approach to render panels based on configuration
 */
export const SidebarPanels: React.FC<SidebarPanelsProps> = ({
  activePlugin,
  showFilePanel,
  showSettingsPanel,
  smoothBrush,
  pathSimplification,
  pathRounding,
  selectedCommands,
  selectedSubpaths,
  updateSmoothBrush,
  updatePathSimplification,
  updatePathRounding,
  applySmoothBrush,
  applyPathSimplification,
  applyPathRounding,
  activateSmoothBrush,
  deactivateSmoothBrush,
  resetSmoothBrush,
}) => {
  // Use specific selectors to prevent unnecessary re-renders
  // Only subscribe to the LENGTH of arrays, not the arrays themselves
  const hasSelectedIds = useCanvasStore(state => state.selectedIds.length > 0);
  const hasSelectedSubpaths = useCanvasStore(state => state.selectedSubpaths.length > 0);
  const hasSelectedCommands = selectedCommands.length > 0;
  
  // Check if we're in special panel mode (file or settings)
  const isInSpecialPanelMode = showFilePanel || showSettingsPanel;
  
  // Check if footer should be shown (when something is selected)
  const hasSelection = hasSelectedIds || hasSelectedCommands || hasSelectedSubpaths;

  // Prepare the context for condition evaluation
  const conditionContext = useMemo(() => ({
    activePlugin,
    showFilePanel,
    showSettingsPanel,
    isInSpecialPanelMode,
  }), [activePlugin, showFilePanel, showSettingsPanel, isInSpecialPanelMode]);

  // Prepare all props for panels that might need them
  const allPanelProps: PanelComponentProps = useMemo(() => ({
    activePlugin,
    smoothBrush,
    pathSimplification,
    pathRounding,
    selectedCommands,
    selectedSubpaths,
    updateSmoothBrush,
    updatePathSimplification,
    updatePathRounding,
    applySmoothBrush,
    applyPathSimplification,
    applyPathRounding,
    activateSmoothBrush,
    deactivateSmoothBrush,
    resetSmoothBrush,
  }), [
    activePlugin,
    smoothBrush,
    pathSimplification,
    pathRounding,
    selectedCommands,
    selectedSubpaths,
    updateSmoothBrush,
    updatePathSimplification,
    updatePathRounding,
    applySmoothBrush,
    applyPathSimplification,
    applyPathRounding,
    activateSmoothBrush,
    deactivateSmoothBrush,
    resetSmoothBrush,
  ]);

  return (
    <Box
      flex={1}
      px={2}
      pb={2}
      mb={hasSelection ? "120px" : "0px"} // Reserve space for footer only when something is selected
      overflowY="auto"
      overflowX="hidden"
      display="flex"
      flexDirection="column"
      gap={0.5}
      bg="white"
      minH={0} // Important: allows flex item to shrink below content size
      css={{
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#555',
        },
      }}
    >
      <Suspense fallback={<Box h="20px" bg="gray.100" />}>
        {PANEL_CONFIGS.map((panelConfig) => {
          const shouldShow = panelConfig.condition(conditionContext);
          
          if (!shouldShow) {
            return null;
          }

          const PanelComponent = panelConfig.component;
          const panelProps = panelConfig.getProps 
            ? panelConfig.getProps(allPanelProps) 
            : {};

          return (
            <ConditionalPanel key={panelConfig.key} condition={true}>
              <PanelComponent {...panelProps} />
            </ConditionalPanel>
          );
        })}
      </Suspense>
    </Box>
  );
};