import React, { Suspense, useMemo } from 'react';
import { Box } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { PathData } from '../../types';
import { calculateBounds } from '../../utils/guidelinesHelpers';
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
  // Check if we're in special panel mode (file or settings)
  const isInSpecialPanelMode = showFilePanel || showSettingsPanel;
  
  // Subscribe to individual selection state to check if footer should be shown
  const hasSelectedIds = useCanvasStore(state => state.selectedIds.length > 0);
  const hasSelectedCommands = selectedCommands.length > 0;
  const hasSelectedSubpaths = useCanvasStore(state => state.selectedSubpaths.length > 0);
  
  const hasSelection = hasSelectedIds || hasSelectedCommands || hasSelectedSubpaths;

  // Get canPerformOpticalAlignment function and check current state
  const canPerformOpticalAlignment = useCanvasStore(state => {
    const selectedElements = state.elements.filter(el => 
      state.selectedIds.includes(el.id) && el.type === 'path'
    );

    if (selectedElements.length !== 2) return false;

    // Use centralized stroke-aware bounds calculation
    const pathData1 = selectedElements[0].data as PathData;
    const pathData2 = selectedElements[1].data as PathData;
    
    const bounds1 = calculateBounds(
      pathData1.subPaths, 
      pathData1.strokeWidth || 0,
      1,
      { includeStroke: true }
    );
    
    const bounds2 = calculateBounds(
      pathData2.subPaths, 
      pathData2.strokeWidth || 0,
      1,
      { includeStroke: true }
    );

    const area1 = (bounds1.maxX - bounds1.minX) * (bounds1.maxY - bounds1.minY);
    const area2 = (bounds2.maxX - bounds2.minX) * (bounds2.maxY - bounds2.minY);

    // One should be at least 1.5x larger than the other
    return Math.max(area1, area2) / Math.min(area1, area2) >= 1.5;
  });

  // Prepare the context for condition evaluation
  const conditionContext = useMemo(() => ({
    activePlugin,
    showFilePanel,
    showSettingsPanel,
    isInSpecialPanelMode,
    canPerformOpticalAlignment,
  }), [activePlugin, showFilePanel, showSettingsPanel, isInSpecialPanelMode, canPerformOpticalAlignment]);

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

          return <PanelComponent key={panelConfig.key} {...panelProps} />;
        })}
      </Suspense>
    </Box>
  );
};