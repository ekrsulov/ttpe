import React from 'react';
import type {
  PluginDefinition,
  PluginUIContribution,
  PluginActionContribution,
  CanvasLayerContribution,
  CanvasLayerPlacement,
} from '../types/plugins';
import type { CanvasStore } from '../store/canvasStore';
import { useCanvasStore, registerPluginSlices, unregisterPluginSlices } from '../store/canvasStore';

export class PluginManager {
  private registry = new Map<string, PluginDefinition<CanvasStore>>();
  private canvasLayers = new Map<string, CanvasLayerContribution[]>();
  private canvasLayerOrder: string[] = [];

  constructor(initialPlugins: PluginDefinition<CanvasStore>[] = []) {
    initialPlugins.forEach((plugin) => this.register(plugin));
  }

  register(plugin: PluginDefinition<CanvasStore>): void {
    if (this.registry.has(plugin.id)) {
      this.unregister(plugin.id);
    }

    this.registry.set(plugin.id, plugin);

    const layerContributions = this.composeCanvasLayers(plugin);
    this.setCanvasLayers(plugin.id, layerContributions);

    if (plugin.slices?.length) {
      const contributions = plugin.slices.map((factory) =>
        factory(useCanvasStore.setState, useCanvasStore.getState, useCanvasStore)
      );
      registerPluginSlices(plugin.id, contributions);
    }
  }

  unregister(pluginId: string): void {
    const existing = this.registry.get(pluginId);
    if (!existing) {
      return;
    }

    this.registry.delete(pluginId);
    this.unregisterCanvasLayers(pluginId);

    if (existing.slices?.length) {
      unregisterPluginSlices(pluginId);
    }
  }

  hasTool(name: string): boolean {
    return this.registry.has(name);
  }

  getPlugin(id: string): PluginDefinition<CanvasStore> | undefined {
    return this.registry.get(id);
  }

  getAll(): PluginDefinition<CanvasStore>[] {
    return Array.from(this.registry.values());
  }

  handleKeyboardEvent(toolName: string, event: KeyboardEvent): void {
    const tool = this.registry.get(toolName);
    const handler = tool?.keyboardShortcuts?.[event.key];
    if (handler) {
      handler(event);
    }
  }

  getCursor(toolName: string): string {
    return this.registry.get(toolName)?.metadata.cursor ?? 'default';
  }

  getOverlays(toolName: string): React.ComponentType<Record<string, unknown>>[] {
    const tool = this.registry.get(toolName);
    return tool?.overlays
      ?.filter((overlay: PluginUIContribution) => overlay.placement !== 'global')
      .map((overlay: PluginUIContribution) => overlay.component as React.ComponentType<Record<string, unknown>>)
      ?? [];
  }

  getGlobalOverlays(): React.ComponentType<Record<string, unknown>>[] {
    return this.getAll()
      .flatMap((plugin) =>
        plugin.overlays?.filter((overlay) => overlay.placement === 'global') ?? []
      )
      .map((overlay) => overlay.component as React.ComponentType<Record<string, unknown>>);
  }

  getPanels(toolName: string): PluginUIContribution[] {
    return this.registry.get(toolName)?.panels ?? [];
  }

  getActions(placement: PluginActionContribution['placement']): PluginActionContribution[] {
    return this.getAll().flatMap((plugin) =>
      plugin.actions?.filter((action) => action.placement === placement) ?? []
    );
  }

  getRegisteredTools(): Array<PluginDefinition<CanvasStore>> {
    return this.getAll();
  }

  registerCanvasLayers(pluginId: string, layers: CanvasLayerContribution[]): void {
    this.setCanvasLayers(pluginId, layers);
  }

  unregisterCanvasLayers(pluginId: string): void {
    this.canvasLayers.delete(pluginId);
    this.canvasLayerOrder = this.canvasLayerOrder.filter((id) => id !== pluginId);
  }

  getCanvasLayers(): Array<CanvasLayerContribution & { pluginId: string }> {
    const placementBuckets: Record<CanvasLayerPlacement, Array<CanvasLayerContribution & { pluginId: string }>> = {
      background: [],
      midground: [],
      foreground: [],
    };

    for (const pluginId of this.canvasLayerOrder) {
      const layers = this.canvasLayers.get(pluginId);
      if (!layers?.length) {
        continue;
      }

      layers.forEach((layer) => {
        const placement = layer.placement ?? 'midground';
        placementBuckets[placement].push({ ...layer, pluginId });
      });
    }

    const placementOrder: CanvasLayerPlacement[] = ['background', 'midground', 'foreground'];
    return placementOrder.flatMap((placement) => placementBuckets[placement]);
  }

  executeHandler(
    toolName: string,
    event: React.PointerEvent,
    point: import('../types').Point,
    target: Element,
    isSmoothBrushActive: boolean,
    beginSelectionRectangle: (point: import('../types').Point, shiftKey?: boolean, subpathMode?: boolean) => void,
    startShapeCreation: (point: import('../types').Point) => void
  ): void {
    const tool = this.registry.get(toolName);
    if (tool?.handler) {
      tool.handler(
        event,
        point,
        target,
        isSmoothBrushActive,
        beginSelectionRectangle,
        startShapeCreation
      );
    }
  }

  private composeCanvasLayers(plugin: PluginDefinition<CanvasStore>): CanvasLayerContribution[] {
    const layers = [...(plugin.canvasLayers ?? [])];

    if (plugin.overlays?.length) {
      plugin.overlays.forEach((overlay) => {
        const OverlayComponent = overlay.component as React.ComponentType<Record<string, unknown>>;
        layers.push({
          id: `overlay-${overlay.id}`,
          placement: 'foreground',
          render: ({ activePlugin, viewport }) => {
            if (overlay.placement === 'global') {
              return React.createElement(OverlayComponent, { viewport });
            }
            return plugin.id === activePlugin
              ? React.createElement(OverlayComponent, { viewport })
              : null;
          },
        });
      });
    }

    return layers;
  }

  private setCanvasLayers(pluginId: string, layers: CanvasLayerContribution[]): void {
    if (!layers.length) {
      this.unregisterCanvasLayers(pluginId);
      return;
    }

    if (!this.canvasLayerOrder.includes(pluginId)) {
      this.canvasLayerOrder.push(pluginId);
    }

    this.canvasLayers.set(pluginId, layers);
  }
}

export const pluginManager = new PluginManager();
