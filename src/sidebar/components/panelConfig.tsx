import React from 'react';
import { CORE_PLUGINS } from '../../plugins';
import type { PanelConfig } from '../../types/panel';

// Lazy load core panel components
const EditorPanel = React.lazy(() => import('../panels/EditorPanel').then(module => ({ default: module.EditorPanel })));
const FilePanel = React.lazy(() => import('../panels/FilePanel').then(module => ({ default: module.FilePanel })));
const SettingsPanel = React.lazy(() => import('../panels/SettingsPanel').then(module => ({ default: module.SettingsPanel })));
const DocumentationPanel = React.lazy(() => import('../panels/DocumentationPanel').then(module => ({ default: module.DocumentationPanel })));

/**
 * Core panel configurations (static panels always available)
 */
const CORE_PANEL_CONFIGS: PanelConfig[] = [
  // Special panels (file and settings)
  {
    key: 'file',
    condition: (ctx) => ctx.showFilePanel,
    component: FilePanel,
  },
  {
    key: 'settings',
    condition: (ctx) => ctx.showSettingsPanel,
    component: SettingsPanel,
  },
  // Regular panels
  {
    key: 'editor',
    condition: (ctx) => !ctx.isInSpecialPanelMode,
    component: EditorPanel,
  },
];

/**
 * Build panel configurations by combining core panels with plugin-contributed panels.
 * This creates a clean, immutable array instead of mutating a global.
 */
function buildPanelConfigs(): PanelConfig[] {
  const configs: PanelConfig[] = [...CORE_PANEL_CONFIGS];

  // Add panels from plugins with pluginId for filtering
  CORE_PLUGINS.forEach(plugin => {
    if (plugin.sidebarPanels) {
      const panelsWithPluginId = plugin.sidebarPanels.map(panel => ({
        ...panel,
        pluginId: plugin.id
      }));
      configs.push(...panelsWithPluginId);
    }
  });

  // Documentation panel at the end
  configs.push({
    key: 'documentation',
    condition: (ctx) => ctx.showSettingsPanel,
    component: DocumentationPanel,
  });

  return configs;
}

/**
 * Panel configuration array
 * Each panel has:
 * - key: unique identifier
 * - condition: function that determines if the panel should be shown
 * - component: the lazy-loaded component
 * - getProps: optional function to extract/map props for the component
 */
export const PANEL_CONFIGS: PanelConfig[] = buildPanelConfigs();