import React from 'react';
import type {
  PluginDefinition,
  PluginUIContribution,
  PluginActionContribution,
  CanvasLayerContribution,
  CanvasLayerPlacement,
  CanvasShortcutDefinition,
  CanvasShortcutMap,
  CanvasShortcutOptions,
  PluginApiContext,
  PluginHandlerContext,
} from '../types/plugins';
import type { CanvasStore, CanvasStoreApi } from '../store/canvasStore';
import { registerPluginSlices, unregisterPluginSlices } from '../store/canvasStore';
import type {
  CanvasEventBus,
  CanvasEventMap,
  CanvasPointerEventPayload,
} from '../canvas/CanvasEventBusContext';
import type { CanvasControllerValue } from '../canvas/controller/CanvasControllerContext';
import { canvasShortcutRegistry } from '../canvas/shortcuts';

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

interface PluginManagerOptions {
  initialPlugins?: PluginDefinition<CanvasStore>[];
  storeApi?: CanvasStoreApi | null;
}

export class PluginManager {
  private registry = new Map<string, PluginDefinition<CanvasStore>>();
  private canvasLayers = new Map<string, CanvasLayerContribution[]>();
  private canvasLayerOrder: string[] = [];
  private eventBus: CanvasEventBus | null = null;
  private interactionSubscriptions = new Map<string, Set<() => void>>();
  private canvasServices = new Map<string, CanvasService<unknown>>();
  private activeCanvasServices = new Map<string, CanvasServiceInstance<unknown>>();
  private shortcutSubscriptions = new Map<string, () => void>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pluginApis = new Map<string, Record<string, (...args: any[]) => any>>();
  private storeApi: CanvasStoreApi | null;

  constructor({ initialPlugins = [], storeApi = null }: PluginManagerOptions = {}) {
    this.storeApi = storeApi;

    initialPlugins.forEach((plugin) => this.register(plugin));
  }

  setStoreApi(storeApi: CanvasStoreApi): void {
    this.storeApi = storeApi;

    this.registry.forEach((plugin) => {
      if (plugin.slices?.length) {
        this.applyPluginSlices(plugin);
      }

      this.initializePluginApi(plugin);
    });
  }

  private requireStoreApi(): CanvasStoreApi {
    if (!this.storeApi) {
      throw new Error(
        'Canvas store API is not available. Ensure PluginManager.setStoreApi() is called before using store-dependent features.'
      );
    }

    return this.storeApi;
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

    this.pluginApis.delete(plugin.id);

    if (this.storeApi) {
      if (plugin.slices?.length) {
        this.applyPluginSlices(plugin);
      }

      this.initializePluginApi(plugin);
    }

    this.bindPluginInteractions(plugin);
    this.bindPluginShortcuts(plugin);
  }

  private createPluginApiContext(): PluginApiContext<CanvasStore> {
    const storeApi = this.requireStoreApi();

    return {
      store: {
        getState: storeApi.getState,
        setState: storeApi.setState,
        subscribe: storeApi.subscribe,
      },
    };
  }

  private applyPluginSlices(plugin: PluginDefinition<CanvasStore>): void {
    if (!plugin.slices?.length) {
      return;
    }

    const storeApi = this.requireStoreApi();
    const contributions = plugin.slices.map((factory) =>
      factory(storeApi.setState, storeApi.getState, storeApi)
    );

    registerPluginSlices(storeApi, plugin.id, contributions);
  }

  private initializePluginApi(plugin: PluginDefinition<CanvasStore>): void {
    if (!plugin.createApi) {
      this.pluginApis.delete(plugin.id);
      return;
    }

    const api = plugin.createApi(this.createPluginApiContext());
    this.pluginApis.set(plugin.id, api);
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
    this.teardownPluginShortcuts(pluginId);
    this.pluginApis.delete(pluginId);

    if (existing.slices?.length && this.storeApi) {
      unregisterPluginSlices(this.storeApi, pluginId);
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

  private bindPluginShortcuts(plugin: PluginDefinition<CanvasStore>): void {
    const shortcuts = plugin.keyboardShortcuts;
    if (!shortcuts) {
      return;
    }

    this.teardownPluginShortcuts(plugin.id);

    const scopedShortcuts: CanvasShortcutMap = {};

    for (const [combination, definition] of Object.entries(shortcuts)) {
      const normalized = this.normalizeShortcutDefinition(definition);
      const existingWhen = normalized.options?.when;

      const when: CanvasShortcutOptions['when'] = (context, event) => {
        const state = context.store.getState() as { activePlugin?: string };
        if (state?.activePlugin !== plugin.id) {
          return false;
        }

        return existingWhen ? existingWhen(context, event) : true;
      };

      scopedShortcuts[combination] = {
        handler: normalized.handler,
        options: {
          ...normalized.options,
          when,
        },
      };
    }

    if (Object.keys(scopedShortcuts).length === 0) {
      return;
    }

    const unsubscribe = canvasShortcutRegistry.register(`plugin:${plugin.id}`, scopedShortcuts);
    this.shortcutSubscriptions.set(plugin.id, unsubscribe);
  }

  private teardownPluginShortcuts(pluginId: string): void {
    const unsubscribe = this.shortcutSubscriptions.get(pluginId);
    if (unsubscribe) {
      unsubscribe();
      this.shortcutSubscriptions.delete(pluginId);
    }
  }

  private normalizeShortcutDefinition(
    definition: CanvasShortcutMap[string]
  ): CanvasShortcutDefinition {
    if (typeof definition === 'function') {
      return { handler: definition };
    }

    return definition;
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

  /**
   * Get the public API of a plugin
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPluginApi<T extends Record<string, (...args: any[]) => any>>(pluginId: string): T | undefined {
    return this.pluginApis.get(pluginId) as T | undefined;
  }

  /**
   * Call a plugin API method
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callPluginApi<TArgs extends any[], TReturn>(
    pluginId: string,
    methodName: string,
    ...args: TArgs
  ): TReturn | undefined {
    const api = this.pluginApis.get(pluginId);
    if (!api || !api[methodName]) {
      console.warn(`Plugin API method "${methodName}" not found in plugin "${pluginId}"`);
      return undefined;
    }
    return api[methodName](...args) as TReturn;
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
    helpers: { isSmoothBrushActive: boolean; beginSelectionRectangle: (point: import('../types').Point, shiftKey?: boolean, subpathMode?: boolean) => void; startShapeCreation: (point: import('../types').Point) => void }
  ): void {
    const tool = this.registry.get(toolName);
    if (tool?.handler) {
      const api = this.pluginApis.get(toolName) ?? {};
      const context: PluginHandlerContext<CanvasStore> = {
        ...this.createPluginApiContext(),
        api,
        helpers,
      };
      tool.handler(
        event,
        point,
        target,
        context
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

        const api = this.pluginApis.get(plugin.id) ?? {};
        const context: PluginHandlerContext<CanvasStore> = {
          ...this.createPluginApiContext(),
          api,
          helpers: payload.helpers,
        };

        handler(
          payload.event as React.PointerEvent,
          payload.point,
          target,
          context
        );
      });

      this.addInteractionSubscription(plugin.id, unsubscribe);
    }
  }
}

export const pluginManager = new PluginManager();
