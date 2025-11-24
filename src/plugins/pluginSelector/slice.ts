import type { PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';

export interface PluginSelectorSlice {
    pluginSelector: {
        enabledPlugins: string[];
        isDialogOpen: boolean;
    };
    setPluginEnabled: (pluginId: string, enabled: boolean) => void;
    setPluginSelectorDialogOpen: (isOpen: boolean) => void;
}

export const createPluginSelectorSlice: PluginSliceFactory<CanvasStore> = (set) => ({
    state: {
        pluginSelector: {
            enabledPlugins: [], // Empty means all enabled by default (logic handled in manager)
            isDialogOpen: false,
        },
        setPluginEnabled: (pluginId: string, enabled: boolean) =>
            set((state) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const currentEnabled = (state as any).pluginSelector.enabledPlugins as string[];
                if (enabled) {
                    // Add to enabled list if not already present
                    if (!currentEnabled.includes(pluginId)) {
                        return {
                            pluginSelector: {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                ...(state as any).pluginSelector,
                                enabledPlugins: [...currentEnabled, pluginId],
                            },
                        } as Partial<CanvasStore>;
                    }
                } else {
                    // Remove from enabled list
                    return {
                        pluginSelector: {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            ...(state as any).pluginSelector,
                            enabledPlugins: currentEnabled.filter((id) => id !== pluginId),
                        },
                    } as Partial<CanvasStore>;
                }
                return state;
            }),
        setPluginSelectorDialogOpen: (isOpen: boolean) =>
            set((state) => ({
                pluginSelector: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ...(state as any).pluginSelector,
                    isDialogOpen: isOpen
                },
            } as Partial<CanvasStore>)),
    },
});
