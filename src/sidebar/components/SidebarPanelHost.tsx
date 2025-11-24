import React, { useMemo } from 'react';
import { SidebarPanels, type SidebarPanelsProps } from './SidebarPanels';
import { pluginManager } from '../../utils/pluginManager';
import { useCanvasStore } from '../../store/canvasStore';

type SidebarPanelHostProps = Omit<SidebarPanelsProps, 'panelContributions'>;

export const SidebarPanelHost: React.FC<SidebarPanelHostProps> = ({ activePlugin, ...rest }) => {
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
    <SidebarPanels
      activePlugin={activePlugin}
      panelContributions={panelContributions}
      {...rest}
    />
  );
};
