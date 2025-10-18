import type React from 'react';
import type { PluginDefinition, PluginUIContribution, PluginActionContribution } from '../types/plugins';
import type { CanvasStore } from '../store/canvasStore';
import { useCanvasStore, registerPluginSlices, unregisterPluginSlices } from '../store/canvasStore';

export class PluginManager {
  private registry = new Map<string, PluginDefinition<CanvasStore>>();

  constructor(initialPlugins: PluginDefinition<CanvasStore>[] = []) {
    initialPlugins.forEach((plugin) => this.register(plugin));
  }

  register(plugin: PluginDefinition<CanvasStore>): void {
    if (this.registry.has(plugin.id)) {
      this.unregister(plugin.id);
    }

    this.registry.set(plugin.id, plugin);

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
}

export const pluginManager = new PluginManager();
