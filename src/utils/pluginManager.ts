import React from 'react';
import { useEffect, useState } from 'react';
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
import type { DragModifier, ElementDragModifier, CanvasDecorator } from '../types/interaction';
import type { CanvasStore, CanvasStoreApi } from '../store/canvasStore';
import { registerPluginSlices, unregisterPluginSlices } from '../store/canvasStore';
import { updateCanvasModeMachine } from '../canvas/modes/CanvasModeMachine';
import type {
  CanvasEventBus,
  CanvasEventMap,
  CanvasPointerEventPayload,
  CanvasElementDoubleClickEventPayload,
  CanvasSubpathDoubleClickEventPayload,
  CanvasDoubleClickEventPayload,
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
  private pluginCleanups = new Map<string, () => void>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pluginApis = new Map<string, Record<string, (...args: any[]) => any>>();
  private dragModifiers = new Map<string, DragModifier>();
  private elementDragModifiers = new Map<string, ElementDragModifier>();
  private canvasDecorators = new Map<string, CanvasDecorator>();
  private lifecycleActions = new Map<string, () => void>();
  private globalTransitionActions: string[] = [];
  private storeApi: CanvasStoreApi | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private helpers = new Map<string, any>();

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
      
      // Call init for plugins that were registered before storeApi was available
      if (plugin.init && !this.pluginCleanups.has(plugin.id)) {
        const context = this.createPluginContext(plugin.id);
        const cleanup = plugin.init(context);
        if (cleanup) {
          this.pluginCleanups.set(plugin.id, cleanup);
        }
      }
    });
  }

  public requireStoreApi(): CanvasStoreApi {
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

  getEventBus(): CanvasEventBus | null {
    return this.eventBus;
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

      // Register helpers if provided
      if (plugin.registerHelpers) {
        const context = this.createPluginContext(plugin.id);
        const helpers = plugin.registerHelpers(context);
        Object.entries(helpers).forEach(([name, helper]) => {
          this.registerHelper(name, helper);
        });
      }

      // Call init if present
      if (plugin.init) {
        const context = this.createPluginContext(plugin.id);
        const cleanup = plugin.init(context);
        if (cleanup) {
          this.pluginCleanups.set(plugin.id, cleanup);
        }
      }
    }

    this.bindPluginInteractions(plugin);
    this.bindPluginShortcuts(plugin);

    // Update canvas mode machine with all registered plugins
    updateCanvasModeMachine(Array.from(this.registry.values()) as PluginDefinition[]);
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

  /**
   * Register a helper function that can be accessed by other plugins
   * @param name - Unique name for the helper
   * @param helperFn - The helper function or value
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerHelper(name: string, helperFn: any): void {
    this.helpers.set(name, helperFn);
  }

  /**
   * Unregister a helper function
   * @param name - Name of the helper to unregister
   */
  unregisterHelper(name: string): void {
    this.helpers.delete(name);
  }

  /**
   * Get a registered helper function
   * @param name - Name of the helper to retrieve
   * @returns The helper function or undefined if not found
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getHelper(name: string): any {
    return this.helpers.get(name);
  }

  /**
   * Get all registered helpers as an object
   * @returns Object with all registered helpers
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAllHelpers(): Record<string, any> {
    return Object.fromEntries(this.helpers);
  }

  /**
   * Get list of tools that should always be shown in the toolbar
   * @returns Array of plugin IDs that have toolDefinition with visibility='always-shown'
   */
  getAlwaysShownTools(): string[] {
    const tools: string[] = [];
    for (const [pluginId, plugin] of this.registry.entries()) {
      if (plugin.toolDefinition && plugin.toolDefinition.visibility === 'always-shown') {
        tools.push(pluginId);
      }
    }
    return tools;
  }

  /**
   * Get list of dynamic tools (tools that can be hidden based on usage)
   * @returns Array of plugin IDs that have toolDefinition with visibility='dynamic' or no visibility specified
   */
  getDynamicTools(): string[] {
    const tools: string[] = [];
    for (const [pluginId, plugin] of this.registry.entries()) {
      if (plugin.toolDefinition && (!plugin.toolDefinition.visibility || plugin.toolDefinition.visibility === 'dynamic')) {
        tools.push(pluginId);
      }
    }
    return tools;
  }

  /**
   * Get all tools with toolDefinition (both always-shown and dynamic)
   * @returns Array of plugin IDs that have a toolDefinition
   */
  getAllTools(): string[] {
    const tools: string[] = [];
    for (const [pluginId, plugin] of this.registry.entries()) {
      if (plugin.toolDefinition) {
        tools.push(pluginId);
      }
    }
    return tools;
  }

  /**
   * Check if the active plugin prevents selection
   * @returns true if selection should be prevented
   */
  shouldPreventSelection(): boolean {
    if (!this.storeApi) return false;

    const state = this.storeApi.getState();

    // Check ALL plugins, not just the active one
    for (const [_pluginId, plugin] of this.registry.entries()) {
      if (plugin.behaviorFlags) {
        const flags = plugin.behaviorFlags(state);
        if (flags.preventsSelection) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if the active plugin prevents subpath interaction
   * @returns true if subpath interaction should be prevented
   */
  shouldPreventSubpathInteraction(): boolean {
    if (!this.storeApi) return false;

    const state = this.storeApi.getState();

    // Check ALL plugins, not just the active one
    for (const [_pluginId, plugin] of this.registry.entries()) {
      if (plugin.behaviorFlags) {
        const flags = plugin.behaviorFlags(state);
        if (flags.preventsSubpathInteraction) {
          return true;
        }
      }
    }

    return false;
  }

  unregister(pluginId: string): void {
    const existing = this.registry.get(pluginId);
    if (!existing) {
      return;
    }

    // Run cleanup
    const cleanup = this.pluginCleanups.get(pluginId);
    if (cleanup) {
      cleanup();
      this.pluginCleanups.delete(pluginId);
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
      // Only filter by activePlugin for events that have it
      const hasActivePlugin = 'activePlugin' in payload;
      if (hasActivePlugin && (payload as { activePlugin: string | null }).activePlugin !== pluginId) {
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

  isPluginEnabled(pluginId: string): boolean {
    if (!this.storeApi) return true;

    // Always enable pluginSelector to prevent lockout
    if (pluginId === 'pluginSelector') return true;

    const state = this.storeApi.getState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const psState = (state as any).pluginSelector;

    // If slice not present or not initialized, default to true
    if (!psState || !psState.enabledPlugins) return true;

    // If list is empty, it might mean initialization hasn't happened yet,
    // OR user disabled everything. 
    // Given the init logic in pluginSelector/index.ts, it populates on start.
    // So if it's empty here, it's either pre-init or user disabled all.
    // We'll trust the list if it exists.
    // However, to be safe during boot, if length is 0, we might want to return true?
    // No, that would prevent "disable all".
    // Let's rely on the fact that 'pluginSelector' is always enabled.

    return psState.enabledPlugins.includes(pluginId);
  }

  getPanels(toolName: string): PluginUIContribution[] {
    if (!this.isPluginEnabled(toolName)) return [];
    return this.registry.get(toolName)?.panels ?? [];
  }

  getActions(placement: PluginActionContribution['placement']): PluginActionContribution[] {
    return this.getAll()
      .filter(plugin => this.isPluginEnabled(plugin.id))
      .flatMap((plugin) =>
        plugin.actions?.filter((action) => action.placement === placement) ?? []
      );
  }

  getRegisteredTools(): Array<PluginDefinition<CanvasStore>> {
    return this.getAll().filter(plugin => this.isPluginEnabled(plugin.id));
  }

  /**
   * Check if the active plugin disables global undo/redo.
   * This is used by BottomActionBar to disable undo/redo buttons when
   * a plugin manages its own history (e.g., pen in drawing mode, curves).
   */
  isGlobalUndoRedoDisabled(): boolean {
    if (!this.storeApi) return false;
    
    const state = this.storeApi.getState();
    const activePluginId = state.activePlugin;
    
    if (!activePluginId) return false;
    
    const plugin = this.registry.get(activePluginId);
    if (!plugin?.disablesGlobalUndoRedo) return false;
    
    return plugin.disablesGlobalUndoRedo(state);
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
      if (!this.isPluginEnabled(pluginId)) continue;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    helpers: Record<string, any>
  ): void {
    if (!this.isPluginEnabled(toolName)) return;

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
    // We don't filter layers here because they are registered once.
    // Instead, we should filter in getCanvasLayers or let the renderer handle it?
    // getCanvasLayers calls this.canvasLayers.get(pluginId).
    // So we should filter in getCanvasLayers.
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
      // Default to pointerdown if not specified, but allow plugins to subscribe to others
      const eventsToSubscribe = plugin.subscribedEvents ?? ['pointerdown'];

      eventsToSubscribe.forEach((eventType) => {
        const unsubscribe = this.eventBus!.subscribe(eventType, (payload: CanvasPointerEventPayload) => {
          if (payload.activePlugin !== plugin.id) {
            return;
          }

          if (!this.isPluginEnabled(plugin.id)) {
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
            pointerState: payload.state,
          };

          handler(
            payload.event as React.PointerEvent,
            payload.point,
            target,
            context
          );
        });

        this.addInteractionSubscription(plugin.id, unsubscribe);
      });
    }

    if (plugin.onElementDoubleClick) {
      const handler = plugin.onElementDoubleClick;
      const unsubscribe = this.eventBus!.subscribe('elementDoubleClick', (payload: CanvasElementDoubleClickEventPayload) => {
        if (payload.activePlugin !== plugin.id) {
          return;
        }

        const api = this.pluginApis.get(plugin.id) ?? {};
        const context: PluginHandlerContext<CanvasStore> = {
          ...this.createPluginApiContext(),
          api,
          helpers: {}, // Double click doesn't provide helpers currently
        };

        handler(
          payload.elementId,
          payload.event,
          context
        );
      });
      this.addInteractionSubscription(plugin.id, unsubscribe);
    }

    if (plugin.onSubpathDoubleClick) {
      const handler = plugin.onSubpathDoubleClick;
      const unsubscribe = this.eventBus!.subscribe('subpathDoubleClick', (payload: CanvasSubpathDoubleClickEventPayload) => {
        if (payload.activePlugin !== plugin.id) {
          return;
        }

        const api = this.pluginApis.get(plugin.id) ?? {};
        const context: PluginHandlerContext<CanvasStore> = {
          ...this.createPluginApiContext(),
          api,
          helpers: {}, // Double click doesn't provide helpers currently
        };

        handler(
          payload.elementId,
          payload.subpathIndex,
          payload.event,
          context
        );
      });
      this.addInteractionSubscription(plugin.id, unsubscribe);
    }

    if (plugin.onCanvasDoubleClick) {
      const handler = plugin.onCanvasDoubleClick;
      const unsubscribe = this.eventBus!.subscribe('canvasDoubleClick', (payload: CanvasDoubleClickEventPayload) => {
        if (payload.activePlugin !== plugin.id) {
          return;
        }

        const api = this.pluginApis.get(plugin.id) ?? {};
        const context: PluginHandlerContext<CanvasStore> = {
          ...this.createPluginApiContext(),
          api,
          helpers: {},
        };

        handler(
          payload.event,
          context
        );
      });
      this.addInteractionSubscription(plugin.id, unsubscribe);
    }
  }

  private createPluginContext(pluginId: string): PluginHandlerContext<CanvasStore> {
    const api = this.pluginApis.get(pluginId) ?? {};
    return {
      ...this.createPluginApiContext(),
      api,
      helpers: {},
    };
  }

  getExpandablePanel(pluginId: string): React.ComponentType | null {
    const plugin = this.registry.get(pluginId);
    return plugin?.expandablePanel ?? null;
  }

  registerDragModifier(modifier: DragModifier): () => void {
    this.dragModifiers.set(modifier.id, modifier);
    return () => {
      this.dragModifiers.delete(modifier.id);
    };
  }

  getDragModifiers(): DragModifier[] {
    return Array.from(this.dragModifiers.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Register an element drag modifier for modifying deltas during element movement.
   * Used by plugins that need to snap or adjust element positions during drag operations.
   */
  registerElementDragModifier(modifier: ElementDragModifier): () => void {
    this.elementDragModifiers.set(modifier.id, modifier);
    return () => {
      this.elementDragModifiers.delete(modifier.id);
    };
  }

  /**
   * Get all registered element drag modifiers, sorted by priority.
   */
  getElementDragModifiers(): ElementDragModifier[] {
    return Array.from(this.elementDragModifiers.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Register a canvas decorator for rendering UI outside the SVG canvas.
   * Used by plugins that need to render rulers, guides, or other decorations.
   */
  registerCanvasDecorator(decorator: CanvasDecorator): () => void {
    this.canvasDecorators.set(decorator.id, decorator);
    return () => {
      this.canvasDecorators.delete(decorator.id);
    };
  }

  /**
   * Get all registered canvas decorators.
   */
  getCanvasDecorators(): CanvasDecorator[] {
    return Array.from(this.canvasDecorators.values());
  }

  /**
   * Get canvas decorators by placement.
   */
  getCanvasDecoratorsByPlacement(placement: CanvasDecorator['placement']): CanvasDecorator[] {
    return this.getCanvasDecorators().filter((d) => d.placement === placement);
  }

  /**
   * Register a lifecycle action that can be executed during mode transitions.
   * Plugins use this to register cleanup actions like clearing guidelines.
   * @param actionId Unique identifier for the action (e.g., 'clearGuidelines')
   * @param handler Function to execute when the action is triggered
   * @param options Optional settings
   * @param options.global If true, action runs on every mode transition
   */
  registerLifecycleAction(
    actionId: string,
    handler: () => void,
    options?: { global?: boolean }
  ): () => void {
    this.lifecycleActions.set(actionId, handler);
    
    if (options?.global) {
      this.globalTransitionActions.push(actionId);
    }
    
    return () => {
      this.lifecycleActions.delete(actionId);
      this.globalTransitionActions = this.globalTransitionActions.filter(id => id !== actionId);
    };
  }

  /**
   * Execute a lifecycle action by ID.
   * Called by the mode controller during transitions.
   */
  executeLifecycleAction(actionId: string): void {
    const handler = this.lifecycleActions.get(actionId);
    if (handler) {
      handler();
    }
  }

  /**
   * Get all global transition actions that should run on every mode change.
   */
  getGlobalTransitionActions(): string[] {
    return [...this.globalTransitionActions];
  }

  getPluginHooks(pluginId: string | null): import('../types/plugins').PluginHookContribution[] {
    if (!pluginId) return [];
    const plugin = this.registry.get(pluginId);
    return plugin?.hooks ?? [];
  }

  /**
   * Get all hooks marked as global from all registered plugins.
   * Global hooks are executed regardless of which plugin is currently active.
   */
  getGlobalPluginHooks(): import('../types/plugins').PluginHookContribution[] {
    const globalHooks: import('../types/plugins').PluginHookContribution[] = [];

    this.registry.forEach((plugin) => {
      if (plugin.hooks) {
        plugin.hooks.forEach((hook) => {
          if (hook.global) {
            globalHooks.push(hook);
          }
        });
      }
    });

    return globalHooks;
  }

  /**
   * Get all tool definitions from registered plugins, sorted by order.
   * Returns an array of tool definitions with metadata from each plugin.
   */
  getToolDefinitions(): Array<{
    mode: string;
    label: string;
    icon?: import('react').ComponentType<{ size?: number }>;
    cursor: string;
    order: number;
    visibility?: 'always-shown' | 'dynamic';
    isDisabled?: (store: CanvasStore) => boolean;
    isVisible?: (store: CanvasStore) => boolean;
  }> {
    const tools: Array<{
      mode: string;
      label: string;
      icon?: import('react').ComponentType<{ size?: number }>;
      cursor: string;
      order: number;
      visibility?: 'always-shown' | 'dynamic';
      isDisabled?: (store: CanvasStore) => boolean;
      isVisible?: (store: CanvasStore) => boolean;
    }> = [];

    this.registry.forEach((plugin) => {
      if (plugin.toolDefinition) {
        tools.push({
          mode: plugin.id,
          label: plugin.metadata.label,
          icon: plugin.metadata.icon,
          cursor: plugin.metadata.cursor ?? 'default',
          order: plugin.toolDefinition.order,
          visibility: plugin.toolDefinition.visibility,
          isDisabled: plugin.toolDefinition.isDisabled,
          isVisible: plugin.toolDefinition.isVisible,
        });
      }
    });

    return tools.sort((a, b) => a.order - b.order);
  }

  /**
   * Check if a tool is currently disabled based on the store state.
   * Returns false if the tool has no isDisabled function defined.
   */
  isToolDisabled(toolId: string, store: CanvasStore): boolean {
    const plugin = this.registry.get(toolId);
    if (!plugin?.toolDefinition?.isDisabled) return false;
    return plugin.toolDefinition.isDisabled(store);
  }

  /**
   * Check if a tool is currently visible based on the store state.
   * Returns true if the tool has no isVisible function defined.
   */
  isToolVisible(toolId: string, store: CanvasStore): boolean {
    const plugin = this.registry.get(toolId);
    if (!plugin?.toolDefinition?.isVisible) return true;
    return plugin.toolDefinition.isVisible(store);
  }

  /**
   * Get the list of visible tool IDs based on current store state.
   * Used to create a visibility signature for reactive updates.
   */
  getVisibleToolIds(store: CanvasStore): string[] {
    const visibleIds: string[] = [];
    this.registry.forEach((plugin) => {
      if (plugin.toolDefinition) {
        if (this.isToolVisible(plugin.id, store)) {
          visibleIds.push(plugin.id);
        }
      }
    });
    return visibleIds.sort();
  }
}

export const pluginManager = new PluginManager();

/**
 * React hook that returns the list of visible tool IDs.
 * Automatically re-evaluates when store state changes that affect tool visibility.
 * This keeps consumers decoupled from specific plugin visibility logic.
 */
export function useVisibleToolIds(): string[] {
  const getVisibleIds = () => {
    const storeApi = pluginManager['storeApi'];
    if (!storeApi) return [];
    return pluginManager.getVisibleToolIds(storeApi.getState());
  };

  const [visibleIds, setVisibleIds] = useState(getVisibleIds);

  useEffect(() => {
    const storeApi = pluginManager['storeApi'];
    if (!storeApi) return;

    // Subscribe to store changes and re-evaluate visibility
    const unsubscribe = storeApi.subscribe(() => {
      const newIds = pluginManager.getVisibleToolIds(storeApi.getState());
      setVisibleIds(prev => {
        // Only update if the list actually changed
        if (prev.length !== newIds.length || prev.some((id, i) => id !== newIds[i])) {
          return newIds;
        }
        return prev;
      });
    });

    return unsubscribe;
  }, []);

  return visibleIds;
}

/**
 * React hook that returns whether global undo/redo should be disabled.
 * This hook handles all store subscriptions internally, keeping the consumer
 * completely decoupled from plugin implementation details.
 */
export function useIsGlobalUndoRedoDisabled(): boolean {
  const [isDisabled, setIsDisabled] = useState(() => pluginManager.isGlobalUndoRedoDisabled());

  useEffect(() => {
    const storeApi = pluginManager['storeApi'];
    if (!storeApi) return;

    // Subscribe to store changes and re-evaluate when state changes
    const unsubscribe = storeApi.subscribe(() => {
      const newValue = pluginManager.isGlobalUndoRedoDisabled();
      setIsDisabled(newValue);
    });

    return unsubscribe;
  }, []);

  return isDisabled;
}
