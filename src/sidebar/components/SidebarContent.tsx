import React, { useMemo } from 'react';
import { Box } from '@chakra-ui/react';
import { SidebarToolGrid } from './SidebarToolGrid';
import { SidebarPanelHost } from './SidebarPanelHost';
import { SidebarFooter } from './SidebarFooter';
import { SidebarResizer } from './SidebarResizer';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { EditPanelContext } from '../../contexts/EditPanelContext';
import { useSidebarContext } from '../../contexts/SidebarContext';
import { useCanvasStore } from '../../store/canvasStore';

interface SidebarContentProps {
  variant: 'pinned' | 'drawer';
  // Resizer props (only for pinned variant)
  onResize?: (newWidth: number) => void;
  onReset?: () => void;
}

export const SidebarContent: React.FC<SidebarContentProps> = ({
  variant,
  onResize,
  onReset,
}) => {
  // Get values from context
  const { showFilePanel, showSettingsPanel } = useSidebarContext();

  // Get selection data from store for EditPanelContext
  const storeSelectedCommands = useCanvasStore((state) => state.selectedCommands);
  const storeSelectedSubpaths = useCanvasStore((state) => state.selectedSubpaths);

  // Memoize EditPanel context value to prevent unnecessary re-renders
  const editPanelContextValue = useMemo(
    () => ({
      selectedCommands: storeSelectedCommands ?? [],
      selectedSubpaths: storeSelectedSubpaths ?? [],
    }),
    [
      storeSelectedCommands,
      storeSelectedSubpaths,
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
        <SidebarToolGrid />

        {/* Main Panels - Scrollable middle section (gets activePlugin from context) */}
        <SidebarPanelHost />

        {/* Footer with ArrangePanel and SelectPanel - Fixed at bottom */}
        {/* Hide in special panel mode (file/settings) */}
        {!showFilePanel && !showSettingsPanel && <SidebarFooter />}
      </Box>
    </EditPanelContext.Provider>
  );
};
