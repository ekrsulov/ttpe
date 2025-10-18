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
import type {
  CanvasEventBus,
  CanvasEventMap,
  CanvasPointerEventPayload,
} from '../canvas/CanvasEventBusContext';
import type { CanvasControllerValue } from '../canvas/controller/CanvasControllerContext';

type CanvasStoreApi = {
  getState: typeof useCanvasStore.getState;
  subscribe: typeof useCanvasStore.subscribe;
};

export interface CanvasServiceContext {
  svg: SVGSVGElement;
  controller: CanvasControllerValue;
  eventBus: CanvasEventBus;
  store: CanvasStoreApi;
}

export interface CanvasServiceInstance<TState = unknown> {
  update?: (state: TState) => void;
  dispose: () => void;
}

export interface CanvasService<TState = unknown> {
  id: string;
  create: (context: CanvasServiceContext) => CanvasServiceInstance<TState>;
}

export class PluginManager {
  private registry = new Map<string, PluginDefinition<CanvasStore>>();
  private canvasLayers = new Map<string, CanvasLayerContribution[]>();
  private canvasLayerOrder: string[] = [];
  private eventBus: CanvasEventBus | null = null;
  private interactionSubscriptions = new Map<string, Set<() => void>>();
  private canvasServices = new Map<string, CanvasService<unknown>>();
  private activeCanvasServices = new Map<string, CanvasServiceInstance<unknown>>();

  constructor(initialPlugins: PluginDefinition<CanvasStore>[] = []) {
    initialPlugins.forEach((plugin) => this.register(plugin));
  }

  setEventBus(eventBus: CanvasEventBus | null): void {
    const activeSubscriptions = Array.from(this.interactionSubscriptions.keys());
    activeSubscriptions.forEach((pluginId) => this.teardownPluginInteractions(pluginId));

    this.eventBus = eventBus;

    if (this.eventBus) {
      this.registry.forEach((plugin) => this.bindPluginInteractions(plugin));
    }
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

    this.bindPluginInteractions(plugin);
  }

  registerCanvasService<TState>(service: CanvasService<TState>): void {
    if (this.canvasServices.has(service.id)) {
      this.unregisterCanvasService(service.id);
    }

    this.canvasServices.set(service.id, service as CanvasService<unknown>);
  }

  unregisterCanvasService(serviceId: string): void {
    this.deactivateCanvasService(serviceId);
    this.canvasServices.delete(serviceId);
  }

  activateCanvasService(serviceId: string, context: CanvasServiceContext): () => void {
    const service = this.canvasServices.get(serviceId);
    if (!service) {
      throw new Error(`Canvas service "${serviceId}" is not registered.`);
    }

    this.deactivateCanvasService(serviceId);

    const instance = service.create(context);
    this.activeCanvasServices.set(serviceId, instance);

    return () => this.deactivateCanvasService(serviceId);
  }

  updateCanvasServiceState<TState>(serviceId: string, state: TState): void {
    const instance = this.activeCanvasServices.get(serviceId) as CanvasServiceInstance<TState> | undefined;
    instance?.update?.(state);
  }

  deactivateCanvasService(serviceId: string): void {
    const instance = this.activeCanvasServices.get(serviceId);
    if (!instance) {
      return;
    }

    instance.dispose();
    this.activeCanvasServices.delete(serviceId);
  }

  unregister(pluginId: string): void {
    const existing = this.registry.get(pluginId);
    if (!existing) {
      return;
    }

    this.registry.delete(pluginId);
    this.unregisterCanvasLayers(pluginId);
    this.teardownPluginInteractions(pluginId);

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

  registerInteractionHandler<K extends keyof CanvasEventMap>(
    pluginId: string,
    eventType: K,
    handler: (payload: CanvasEventMap[K]) => void
  ): () => void {
    if (!this.eventBus) {
      throw new Error('Canvas event bus is not available. Ensure the canvas is mounted before registering handlers.');
    }

    const wrappedHandler = (payload: CanvasEventMap[K]) => {
      if (payload.activePlugin !== pluginId) {
        return;
      }
      handler(payload);
    };

    const unsubscribe = this.eventBus.subscribe(eventType, wrappedHandler);
    this.addInteractionSubscription(pluginId, unsubscribe);

    return () => {
      unsubscribe();
      this.removeInteractionSubscription(pluginId, unsubscribe);
    };
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

  private addInteractionSubscription(pluginId: string, unsubscribe: () => void): void {
    if (!this.interactionSubscriptions.has(pluginId)) {
      this.interactionSubscriptions.set(pluginId, new Set());
    }

    this.interactionSubscriptions.get(pluginId)!.add(unsubscribe);
  }

  private removeInteractionSubscription(pluginId: string, unsubscribe: () => void): void {
    const subscriptions = this.interactionSubscriptions.get(pluginId);
    if (!subscriptions) {
      return;
    }

    subscriptions.delete(unsubscribe);
    if (subscriptions.size === 0) {
      this.interactionSubscriptions.delete(pluginId);
    }
  }

  private teardownPluginInteractions(pluginId: string): void {
    const subscriptions = this.interactionSubscriptions.get(pluginId);
    if (!subscriptions) {
      return;
    }

    subscriptions.forEach((unsubscribe) => unsubscribe());
    this.interactionSubscriptions.delete(pluginId);
  }

  private bindPluginInteractions(plugin: PluginDefinition<CanvasStore>): void {
    if (!this.eventBus) {
      return;
    }

    this.teardownPluginInteractions(plugin.id);

    if (plugin.handler) {
      const handler = plugin.handler;
      const unsubscribe = this.eventBus.subscribe('pointerdown', (payload: CanvasPointerEventPayload) => {
        if (payload.activePlugin !== plugin.id) {
          return;
        }

        const target = payload.target as Element | null;
        if (!target) {
          return;
        }

        const beginSelectionRectangle = payload.helpers.beginSelectionRectangle ?? (() => {});
        const startShapeCreation = payload.helpers.startShapeCreation ?? (() => {});
        const isSmoothBrushActive = Boolean(payload.helpers.isSmoothBrushActive);

        handler(
          payload.event as React.PointerEvent,
          payload.point,
          target,
          isSmoothBrushActive,
          beginSelectionRectangle,
          startShapeCreation
        );
      });

      this.addInteractionSubscription(plugin.id, unsubscribe);
    }

    if (plugin.keyboardShortcuts) {
      const unsubscribe = this.eventBus.subscribe('keyboard', ({ event, activePlugin }) => {
        if (activePlugin !== plugin.id) {
          return;
        }

        const handler = plugin.keyboardShortcuts?.[event.key];
        if (handler) {
          handler(event);
        }
      });

      this.addInteractionSubscription(plugin.id, unsubscribe);
    }
  }
}

export const pluginManager = new PluginManager();
