import { CORE_PLUGINS } from '../../plugins';
import type { PanelConfig } from '../../types/panel';
import { panelRegistry, initializePanelRegistry } from '../../utils/panelRegistry';

// Initialize the panel registry
initializePanelRegistry();

// Register plugin panels into the registry
CORE_PLUGINS.forEach(plugin => {
  if (plugin.sidebarPanels) {
    plugin.sidebarPanels.forEach(panel => {
      if (!panelRegistry.has(`${plugin.id}:${panel.key}`)) {
        // Insert settings-related panels before documentation panel
        const docIndex = panelRegistry.getAll().findIndex(p => p.key === 'documentation');
        const isSettingsPanel = panel.condition?.({ showSettingsPanel: true, showFilePanel: false, isInSpecialPanelMode: true, activePlugin: '', canPerformOpticalAlignment: false });
        const position = isSettingsPanel && docIndex >= 0 ? docIndex : 'end';
        
        panelRegistry.register({
          ...panel,
          key: `${plugin.id}:${panel.key}`,
          // @ts-expect-error - Adding pluginId for filtering
          pluginId: plugin.id,
        }, position);
      }
    });
  }
});

/**
 * Get panel configurations dynamically from the registry.
 * Returns all registered panels including core panels (file, settings, editor, documentation)
 * and plugin-contributed panels.
 */
export function getPanelConfigs(): PanelConfig[] {
  return panelRegistry.getAll();
}