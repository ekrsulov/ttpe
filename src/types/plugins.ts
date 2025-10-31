import type { ComponentType, PointerEvent, ReactNode } from 'react';
import type { StoreApi } from 'zustand';
import type { Point, CanvasElement } from '.';
import type { CanvasControllerValue } from '../canvas/controller/CanvasControllerContext';
import type { Bounds } from '../utils/boundsUtils';
import type { CanvasEventBus } from '../canvas/CanvasEventBusContext';
import type { PointPositionFeedback } from '../canvas/hooks/useCanvasShapeCreation';

export type CanvasShortcutStoreApi = Pick<StoreApi<object>, 'getState' | 'subscribe'>;

export interface CanvasShortcutContext {
  eventBus: CanvasEventBus;
  controller: CanvasControllerValue;
  store: CanvasShortcutStoreApi;
  svg?: SVGSVGElement | null;
}

export type CanvasShortcutHandler = (event: KeyboardEvent, context: CanvasShortcutContext) => void;

export interface CanvasShortcutOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
  allowWhileTyping?: boolean;
  when?: (context: CanvasShortcutContext, event: KeyboardEvent) => boolean;
}

export interface CanvasShortcutDefinition {
  handler: CanvasShortcutHandler;
  options?: CanvasShortcutOptions;
}

export type CanvasShortcutMap = Record<string, CanvasShortcutDefinition | CanvasShortcutHandler>;

export interface PluginUIContribution<TProps = Record<string, unknown>> {
  id: string;
  component: ComponentType<TProps>;
  placement?: 'tool' | 'global';
}

export type CanvasLayerPlacement = 'background' | 'midground' | 'foreground';

export interface CanvasLayerContext extends CanvasControllerValue, Record<string, any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  canvasSize: { width: number; height: number };
  isSelecting: boolean;
  selectionStart: Point | null;
  selectionEnd: Point | null;
  selectedGroupBounds: Array<{ id: string; bounds: Bounds }>;
  dragPosition: Point | null;
  isDragging: boolean;
  getElementBounds: (element: CanvasElement) => Bounds | null;
  setDragStart: (point: Point | null) => void;
  pointPositionFeedback?: PointPositionFeedback;
}

export interface CanvasLayerContribution {
  id: string;
  placement?: CanvasLayerPlacement;
  render: (context: CanvasLayerContext) => ReactNode;
}

export interface PluginActionContribution<TProps = Record<string, unknown>> {
  id: string;
  component: ComponentType<TProps>;
  placement: 'top' | 'bottom';
}

export type PluginStoreApi<TStore extends object> = Pick<StoreApi<TStore>, 'getState' | 'setState' | 'subscribe'>;

export interface PluginApiContext<TStore extends object> {
  store: PluginStoreApi<TStore>;
}

export type PluginHandlerHelpers = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface PluginHandlerContext<TStore extends object> extends PluginApiContext<TStore> {
  api: Record<string, (...args: never[]) => unknown>;
  helpers: PluginHandlerHelpers;
}

 
export type PluginApiFactory<TStore extends object> = (
  context: PluginApiContext<TStore>
) => Record<string, (...args: never[]) => unknown>;

export type PluginSliceFactory<TStore extends object = object> = (
  set: StoreApi<TStore>['setState'],
  get: StoreApi<TStore>['getState'],
  api: StoreApi<TStore>
) => {
  state: Partial<TStore>;
  cleanup?: (
    set: StoreApi<TStore>['setState'],
    get: StoreApi<TStore>['getState'],
    api: StoreApi<TStore>
  ) => void;
};

export interface PluginDefinition<TStore extends object = object> {
  id: string;
  metadata: {
    label: string;
    icon?: ComponentType<{ size?: number }>;
    cursor?: string;
  };
  handler?: (
    event: PointerEvent,
    point: Point,
    target: Element,
    context: PluginHandlerContext<TStore>
  ) => void;
  keyboardShortcuts?: CanvasShortcutMap;
  overlays?: PluginUIContribution[];
  canvasLayers?: CanvasLayerContribution[];
  panels?: PluginUIContribution[];
  actions?: PluginActionContribution[];
  slices?: PluginSliceFactory<TStore>[];
  /**
   * Public API factory exposed by the plugin for use by other parts of the application.
   * This allows plugins to expose functionality without coupling to the store.
   */
  createApi?: PluginApiFactory<TStore>;
}
