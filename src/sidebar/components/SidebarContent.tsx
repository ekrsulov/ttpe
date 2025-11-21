import React, { useMemo } from 'react';
import { Box } from '@chakra-ui/react';
import { SidebarToolGrid } from './SidebarToolGrid';
import { SidebarPanelHost } from './SidebarPanelHost';
import { SidebarFooter } from './SidebarFooter';
import { SidebarResizer } from './SidebarResizer';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { EditPanelContext } from '../../contexts/EditPanelContext';
import type {
  SelectedCommand
} from '../../types/panel';

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
  selectedCommands: SelectedCommand[];
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }>;
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
  selectedCommands,
  selectedSubpaths,
  isArrangeExpanded,
  setIsArrangeExpanded,
  onResize,
  onReset,
}) => {
  // Memoize EditPanel context value to prevent unnecessary re-renders
  const editPanelContextValue = useMemo(
    () => ({
      selectedCommands,
      selectedSubpaths,
    }),
    [
      selectedCommands,
      selectedSubpaths,
    ]
  );


  return (
    <EditPanelContext.Provider value={editPanelContextValue}>
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
      <Box bg="surface.panel" p={0} display="flex" flexDirection="column" flex="1" overflow="hidden" position="relative">
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
    </EditPanelContext.Provider>
  );
};
