import { Settings } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginManagerSlice } from './slice';
import { PluginManagerDialog } from './PluginManagerDialog';
import { PluginManagerAction } from './PluginManagerAction';
import { pluginManager } from '../../utils/pluginManager';

export const pluginManagerPlugin: PluginDefinition<CanvasStore> = {
    id: 'pluginManager',
    metadata: {
        label: 'Plugin Manager',
        icon: Settings,
        cursor: 'default',
    },
    slices: [createPluginManagerSlice],
    overlays: [
        {
            id: 'pluginManager-dialog',
            component: PluginManagerDialog,
            placement: 'global',
        },
    ],
    actions: [
        {
            id: 'pluginManager-settings-action',
            component: PluginManagerAction,
            placement: 'settings-panel',
        },
    ],
    init: (context) => {
        // Initialize enabled plugins with all registered plugins
        // Only if not already populated (first time use)
        const state = context.store.getState();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pmState = (state as any).pluginManager;

        // Only initialize if enabledPlugins is empty or doesn't exist
        if (pmState && (!pmState.enabledPlugins || pmState.enabledPlugins.length === 0)) {
            const allPluginIds = pluginManager.getAll().map(p => p.id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (context.store.setState as any)({
                pluginManager: {
                    ...pmState,
                    enabledPlugins: allPluginIds
                }
            });
        }

        return () => { };
    }
};
