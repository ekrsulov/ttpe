import React, { Suspense, useMemo } from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { useSidebarContext } from '../../contexts/SidebarContext';
import { useEnabledPlugins } from '../../hooks';
import {
  getPanelConfigs,
} from './panelConfig';
import type { PanelComponentProps } from '../../types/panel';
import type { PluginUIContribution } from '../../types/plugins';
import { pluginManager } from '../../utils/pluginManager';

export interface SidebarPanelsProps {
  panelContributions?: PluginUIContribution[];
}

/**
 * Main panels section of the sidebar with conditional rendering
 * Uses a data-driven approach to render panels based on configuration.
 * State comes from SidebarContext and store directly.
 */
export const SidebarPanels: React.FC<SidebarPanelsProps> = ({
  panelContributions = [],
}) => {
  // Get state from sidebar context
  const { activePlugin, showFilePanel, showSettingsPanel } = useSidebarContext();

  const scrollbarTrack = useColorModeValue('#f1f1f1', 'rgba(255, 255, 255, 0.06)');
  const scrollbarThumb = useColorModeValue('#888', 'rgba(255, 255, 255, 0.3)');
  // Subscribe to enabledPlugins to trigger re-render when plugins are toggled
  const enabledPlugins = useEnabledPlugins();

  const scrollbarThumbHover = useColorModeValue('#555', 'rgba(255, 255, 255, 0.45)');

  // Check if we're in special panel mode (file or settings)
  const isInSpecialPanelMode = showFilePanel || showSettingsPanel;

  const canPerformOpticalAlignment = useCanvasStore((state) => {
    const selectedElements = state.elements.filter((el) => state.selectedIds.includes(el.id));
    return selectedElements.length > 0;
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
  }), [activePlugin]);

  // Filter panel configs to only include panels from enabled plugins
  const filteredPanelConfigs = useMemo(() => {
    return getPanelConfigs().filter(panelConfig => {
      // If panel has a pluginId property, check if that plugin is enabled
      if ('pluginId' in panelConfig && typeof panelConfig.pluginId === 'string') {
        return pluginManager.isPluginEnabled(panelConfig.pluginId);
      }
      // Built-in panels (file, settings, editor, pan, documentation) are always shown
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledPlugins]);

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
        {filteredPanelConfigs.map((panelConfig) => {
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