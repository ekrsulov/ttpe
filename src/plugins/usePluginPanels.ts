import { useMemo } from 'react';
import type { ComponentType } from 'react';
import { CORE_PLUGINS } from './index';
import type { PluginDefinition, PluginPanelContribution } from '../types/plugins';

interface PluginPanel {
    id: string;
    component: ComponentType<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    order: number;
}

/**
 * Hook to get panels contributed to a specific plugin.
 * Plugins can declare panels that appear in other plugins using the relatedPluginPanels field.
 * 
 * @param targetPluginId - The plugin ID to get contributed panels for (e.g., 'edit')
 * @returns Sorted array of panel contributions, ordered by the order field (lower = first)
 */
export function usePluginPanels(targetPluginId: string): PluginPanel[] {
    return useMemo(() => {
        const panels: PluginPanel[] = [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        CORE_PLUGINS.forEach((plugin: PluginDefinition<any>) => {
            plugin.relatedPluginPanels?.forEach((panelContrib: PluginPanelContribution) => {
                if (panelContrib.targetPlugin === targetPluginId) {
                    panels.push({
                        id: panelContrib.id,
                        component: panelContrib.component,
                        order: panelContrib.order ?? 999,
                    });
                }
            });
        });

        // Sort by order (lower numbers first)
        panels.sort((a, b) => a.order - b.order);

        return panels;
    }, [targetPluginId]);
}
