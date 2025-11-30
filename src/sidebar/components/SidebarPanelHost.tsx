import React, { useMemo } from 'react';
import { SidebarPanels } from './SidebarPanels';
import { pluginManager } from '../../utils/pluginManager';
import { useCanvasStore } from '../../store/canvasStore';
import { useSidebarContext } from '../../contexts/SidebarContext';

/**
 * Host component that connects SidebarPanels with plugin contributions.
 * Gets activePlugin from context and resolves panel contributions.
 */
export const SidebarPanelHost: React.FC = () => {
  const { activePlugin } = useSidebarContext();
  
  // Subscribe to enabledPlugins to trigger re-render when plugins are toggled
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enabledPlugins = useCanvasStore(state => (state as any).pluginSelector?.enabledPlugins ?? []);

  const panelContributions = useMemo(() => {
    if (!activePlugin) {
      return [];
    }
    return pluginManager.getPanels(activePlugin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlugin, enabledPlugins]);

  return (
    <SidebarPanels panelContributions={panelContributions} />
  );
};
