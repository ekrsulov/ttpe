import React from 'react';
import type { SmoothBrush } from '../../plugins/smoothBrush/slice';
import { CORE_PLUGINS } from '../../plugins';
import type { PanelConfig } from '../../types/panel';

// Re-export SmoothBrush for backward compatibility
export type { SmoothBrush };

// Lazy load core panel components
const EditorPanel = React.lazy(() => import('../panels/EditorPanel').then(module => ({ default: module.EditorPanel })));
const PanPanel = React.lazy(() => import('../panels/PanPanel').then(module => ({ default: module.PanPanel })));
const FilePanel = React.lazy(() => import('../panels/FilePanel').then(module => ({ default: module.FilePanel })));
const SettingsPanel = React.lazy(() => import('../panels/SettingsPanel').then(module => ({ default: module.SettingsPanel })));
const DocumentationPanel = React.lazy(() => import('../panels/DocumentationPanel').then(module => ({ default: module.DocumentationPanel })));

/**
 * Panel configuration array
 * Each panel has:
 * - key: unique identifier
 * - condition: function that determines if the panel should be shown
 * - component: the lazy-loaded component
 * - getProps: optional function to extract/map props for the component
 */
export const PANEL_CONFIGS: PanelConfig[] = [
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
  {
    key: 'pan',
    condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'pan',
    component: PanPanel,
  },

  {
    key: 'documentation',
    condition: (ctx) => ctx.showSettingsPanel,
    component: DocumentationPanel,
  },
];

// Dynamically add panels from plugins
CORE_PLUGINS.forEach(plugin => {
  if (plugin.sidebarPanels) {
    PANEL_CONFIGS.push(...plugin.sidebarPanels);
  }
});

