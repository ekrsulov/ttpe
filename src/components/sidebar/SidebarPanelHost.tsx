import React, { useMemo } from 'react';
import { SidebarPanels, type SidebarPanelsProps } from './SidebarPanels';
import { pluginManager } from '../../utils/pluginManager';

type SidebarPanelHostProps = Omit<SidebarPanelsProps, 'panelContributions'>;

export const SidebarPanelHost: React.FC<SidebarPanelHostProps> = ({ activePlugin, ...rest }) => {
  const panelContributions = useMemo(() => {
    if (!activePlugin) {
      return [];
    }
    return pluginManager.getPanels(activePlugin);
  }, [activePlugin]);

  return (
    <SidebarPanels
      activePlugin={activePlugin}
      panelContributions={panelContributions}
      {...rest}
    />
  );
};
