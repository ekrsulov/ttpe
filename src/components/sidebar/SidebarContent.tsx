import React from 'react';
import { Box } from '@chakra-ui/react';
import { SidebarToolGrid } from './SidebarToolGrid';
import { SidebarPanelHost } from './SidebarPanelHost';
import { SidebarFooter } from './SidebarFooter';
import { SidebarResizer } from './SidebarResizer';
import { RenderCountBadgeWrapper } from '../ui/RenderCountBadgeWrapper';
import type { 
  SmoothBrush, 
  PathSimplification, 
  PathRounding, 
  SelectedCommand 
} from './panelConfig';

interface SidebarContentProps {
  variant: 'pinned' | 'drawer';
  activePlugin: string | null;
  setMode: (mode: string) => void;
  onToolClick: (toolName: string) => void;
  showFilePanel: boolean;
  showSettingsPanel: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
  isDesktop: boolean | undefined;
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
  isArrangeExpanded: boolean;
  setIsArrangeExpanded: (value: boolean) => void;
  // Resizer props (only for pinned variant)
  onResize?: (newWidth: number) => void;
  onReset?: () => void;
}

export const SidebarContent: React.FC<SidebarContentProps> = ({
  variant,
  activePlugin,
  setMode,
  onToolClick,
  showFilePanel,
  showSettingsPanel,
  isPinned,
  onTogglePin,
  isDesktop,
  smoothBrush,
  addPointMode,
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
  activateAddPointMode,
  deactivateAddPointMode,
  isArrangeExpanded,
  setIsArrangeExpanded,
  onResize,
  onReset,
}) => {
  return (
    <>
      {/* Resizer handle - only for pinned variant */}
      {variant === 'pinned' && onResize && onReset && (
        <SidebarResizer
          onResize={onResize}
          onReset={onReset}
          minWidth={260}
          maxWidth={600}
        />
      )}
      
      {/* Body container with relative positioning for absolute footer */}
      <Box p={0} display="flex" flexDirection="column" flex="1" overflow="hidden" position="relative">
        {variant === 'pinned' && (
          <RenderCountBadgeWrapper componentName="Sidebar" position="top-right" />
        )}
        
        {/* Tools Grid - Fixed at top */}
        <SidebarToolGrid 
          activePlugin={activePlugin}
          setMode={setMode}
          onToolClick={onToolClick}
          showFilePanel={showFilePanel}
          showSettingsPanel={showSettingsPanel}
          isPinned={isPinned}
          onTogglePin={onTogglePin}
          isDesktop={isDesktop}
        />

        {/* Main Panels - Scrollable middle section */}
        <SidebarPanelHost
          activePlugin={activePlugin}
          showFilePanel={showFilePanel}
          showSettingsPanel={showSettingsPanel}
          smoothBrush={smoothBrush}
          addPointMode={addPointMode}
          pathSimplification={pathSimplification}
          pathRounding={pathRounding}
          selectedCommands={selectedCommands}
          selectedSubpaths={selectedSubpaths}
          updateSmoothBrush={updateSmoothBrush}
          updatePathSimplification={updatePathSimplification}
          updatePathRounding={updatePathRounding}
          applySmoothBrush={applySmoothBrush}
          applyPathSimplification={applyPathSimplification}
          applyPathRounding={applyPathRounding}
          activateSmoothBrush={activateSmoothBrush}
          deactivateSmoothBrush={deactivateSmoothBrush}
          resetSmoothBrush={resetSmoothBrush}
          activateAddPointMode={activateAddPointMode}
          deactivateAddPointMode={deactivateAddPointMode}
        />

        {/* Footer with ArrangePanel and SelectPanel - Fixed at bottom */}
        {/* Hide in special panel mode (file/settings) */}
        {!showFilePanel && !showSettingsPanel && (
          <SidebarFooter
            isArrangeExpanded={isArrangeExpanded}
            setIsArrangeExpanded={setIsArrangeExpanded}
          />
        )}
      </Box>
    </>
  );
};
