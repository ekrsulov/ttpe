import { Settings } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSelectorSlice } from './slice';
import { PluginSelectorDialog } from './PluginSelectorDialog';
import { PluginSelectorAction } from './PluginSelectorAction';
import { pluginManager } from '../../utils/pluginManager';

export const pluginSelectorPlugin: PluginDefinition<CanvasStore> = {
    id: 'pluginSelector',
    metadata: {
        label: 'Plugin Selector',
        icon: Settings,
        cursor: 'default',
    },
    slices: [createPluginSelectorSlice],
    overlays: [
        {
            id: 'pluginSelector-dialog',
            component: PluginSelectorDialog,
            placement: 'global',
        },
    ],
    actions: [
        {
            id: 'pluginSelector-settings-action',
            component: PluginSelectorAction,
            placement: 'settings-panel',
        },
    ],
    init: (context) => {
        // Initialize enabled plugins with all registered plugins
        // Only if not already populated (first time use)
        const state = context.store.getState();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const psState = (state as any).pluginSelector;

        let newState = psState ? { ...psState } : {};
        let hasChanges = false;

        // Only initialize if enabledPlugins is empty or doesn't exist
        if (psState && (!psState.enabledPlugins || psState.enabledPlugins.length === 0)) {
            const allPluginIds = pluginManager.getAll().map(p => p.id);
            newState.enabledPlugins = allPluginIds;
            hasChanges = true;
        }

        // Force dialog closed on init to prevent blocking UI (e.g. from persisted state)
        if (psState && psState.isDialogOpen) {
            newState.isDialogOpen = false;
            hasChanges = true;
        }

        if (hasChanges) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (context.store.setState as any)({
                pluginSelector: newState
            });
        }

        return () => { };
    }
};
