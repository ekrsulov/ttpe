import React from 'react';
import { CORE_PLUGINS } from '../../plugins';
import type { PanelConfig } from '../../types/panel';
import { panelRegistry, initializePanelRegistry } from '../../utils/panelRegistry';

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
 * 
 * @deprecated This function will be removed in a future version.
 * Use panelRegistry.getAll() instead after calling initializePanelRegistry().
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

// Initialize the panel registry for new consumers
initializePanelRegistry();

// Register plugin panels into the registry
CORE_PLUGINS.forEach(plugin => {
  if (plugin.sidebarPanels) {
    plugin.sidebarPanels.forEach(panel => {
      if (!panelRegistry.has(`${plugin.id}:${panel.key}`)) {
        panelRegistry.register({
          ...panel,
          key: `${plugin.id}:${panel.key}`,
          // @ts-expect-error - Adding pluginId for filtering
          pluginId: plugin.id,
        });
      }
    });
  }
});

/**
 * Panel configuration array
 * Each panel has:
 * - key: unique identifier
 * - condition: function that determines if the panel should be shown
 * - component: the lazy-loaded component
 * - getProps: optional function to extract/map props for the component
 * 
 * @deprecated Use panelRegistry.getAll() for dynamic panel access.
 * This export is maintained for backward compatibility.
 */
export const PANEL_CONFIGS: PanelConfig[] = buildPanelConfigs();

/**
 * Get panel configurations dynamically from the registry.
 * Preferred over PANEL_CONFIGS for new code.
 */
export function getPanelConfigs(): PanelConfig[] {
  return panelRegistry.getAll();
}