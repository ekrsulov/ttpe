import React, { Suspense, useMemo } from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { useEditPanelContext } from '../../contexts/EditPanelContext';
import {
  PANEL_CONFIGS,
} from './panelConfig';
import type { PanelComponentProps } from '../../types/panel';
import type { PluginUIContribution } from '../../types/plugins';

export interface SidebarPanelsProps {
  activePlugin: string | null;
  showFilePanel: boolean;
  showSettingsPanel: boolean;
  panelContributions?: PluginUIContribution[];
}

/**
 * Main panels section of the sidebar with conditional rendering
 * Uses a data-driven approach to render panels based on configuration.
 * EditPanel props are now accessed via EditPanelContext instead of prop drilling.
 */
export const SidebarPanels: React.FC<SidebarPanelsProps> = ({
  activePlugin,
  showFilePanel,
  showSettingsPanel,
  panelContributions = [],
}) => {
  const scrollbarTrack = useColorModeValue('#f1f1f1', 'rgba(255, 255, 255, 0.06)');
  const scrollbarThumb = useColorModeValue('#888', 'rgba(255, 255, 255, 0.3)');
  const scrollbarThumbHover = useColorModeValue('#555', 'rgba(255, 255, 255, 0.45)');
  // Get EditPanel context for panels that need it
  const editPanelContext = useEditPanelContext();

  // Check if we're in special panel mode (file or settings)
  const isInSpecialPanelMode = showFilePanel || showSettingsPanel;

  // Use centralized optical alignment eligibility check from store
  const canPerformOpticalAlignment = useCanvasStore(state => state.canPerformOpticalAlignment?.() ?? false);

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
    ...editPanelContext,
  }), [
    activePlugin,
    editPanelContext,
  ]);

  return (
    <Box
      flex={1}
      px={2}
      pb={2}
      mb="calc(var(--sidebar-footer-height, 0px) + 16px)" // Reserve space for footer based on actual height
      overflowY="auto"
      overflowX="hidden"
      display="flex"
      flexDirection="column"
      gap={0.5}
      bg="surface.panel"
      minH={0} // Important: allows flex item to shrink below content size
      css={{
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: scrollbarTrack,
        },
        '&::-webkit-scrollbar-thumb': {
          background: scrollbarThumb,
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: scrollbarThumbHover,
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

        {!isInSpecialPanelMode &&
          panelContributions.map((panel) => {
            const PanelComponent = panel.component as React.ComponentType<PanelComponentProps>;
            return <PanelComponent key={panel.id} {...allPanelProps} />;
          })}
      </Suspense>
    </Box>
  );
};