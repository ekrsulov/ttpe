import type { PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';

export interface PluginManagerSlice {
    pluginManager: {
        enabledPlugins: string[];
        isDialogOpen: boolean;
    };
    setPluginEnabled: (pluginId: string, enabled: boolean) => void;
    setPluginManagerDialogOpen: (isOpen: boolean) => void;
}

export const createPluginManagerSlice: PluginSliceFactory<CanvasStore> = (set) => ({
    state: {
        pluginManager: {
            enabledPlugins: [], // Empty means all enabled by default (logic handled in manager)
            isDialogOpen: false,
        },
        setPluginEnabled: (pluginId: string, enabled: boolean) =>
            set((state) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const currentEnabled = (state as any).pluginManager.enabledPlugins as string[];
                if (enabled) {
                    // Add to enabled list if not already present
                    if (!currentEnabled.includes(pluginId)) {
                        return {
                            pluginManager: {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                ...(state as any).pluginManager,
                                enabledPlugins: [...currentEnabled, pluginId],
                            },
                        } as Partial<CanvasStore>;
                    }
                } else {
                    // Remove from enabled list
                    return {
                        pluginManager: {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            ...(state as any).pluginManager,
                            enabledPlugins: currentEnabled.filter((id) => id !== pluginId),
                        },
                    } as Partial<CanvasStore>;
                }
                return state;
            }),
        setPluginManagerDialogOpen: (isOpen: boolean) =>
            set((state) => ({
                pluginManager: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ...(state as any).pluginManager,
                    isDialogOpen: isOpen
                },
            } as Partial<CanvasStore>)),
    },
});
