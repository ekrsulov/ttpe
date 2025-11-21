import type { ComponentType, PointerEvent, MouseEvent, ReactNode } from 'react';
import type { StoreApi } from 'zustand';
import type { Point, CanvasElement } from '.';
import type { CanvasControllerValue } from '../canvas/controller/CanvasControllerContext';
import type { Bounds } from '../utils/boundsUtils';
import type { CanvasEventBus, CanvasPointerEventState } from '../canvas/CanvasEventBusContext';
import type { PointPositionFeedback } from '../canvas/interactions/ShapeCreationController';

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

export interface PluginPanelContribution<TProps = Record<string, unknown>> {
  id: string;
  /** Which plugin this panel should appear in (e.g., 'edit') */
  targetPlugin: string;
  component: ComponentType<TProps>;
  /** Optional ordering hint - lower numbers appear first */
  order?: number;
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
  pointerState?: CanvasPointerEventState;
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

export interface PluginHooksContext {
  svgRef: React.RefObject<SVGSVGElement | null>;
  screenToCanvas: (x: number, y: number) => Point;
  emitPointerEvent: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: any,
    point: Point
  ) => void;
  activePlugin: string | null;
  viewportZoom: number;
  scaleStrokeWithZoom: boolean;
}

export interface PluginHookContribution {
  id: string;
  hook: (context: PluginHooksContext) => void;
};

export interface PluginDefinition<TStore extends object = object> {
  id: string;
  metadata: {
    label: string;
    icon?: ComponentType<{ size?: number }>;
    cursor?: string;
    disablePathInteraction?: boolean;
    pathCursorMode?: 'select' | 'default' | 'pointer';
  };
  /**
   * Events to subscribe to. Defaults to ['pointerdown'] if handler is present.
   * Add 'pointermove' and 'pointerup' to receive those events.
   */
  subscribedEvents?: ('pointerdown' | 'pointermove' | 'pointerup')[];
  handler?: (
    event: PointerEvent,
    point: Point,
    target: Element,
    context: PluginHandlerContext<TStore>
  ) => void;
  onElementDoubleClick?: (
    elementId: string,
    event: MouseEvent<Element>,
    context: PluginHandlerContext<TStore>
  ) => void;
  onSubpathDoubleClick?: (
    elementId: string,
    subpathIndex: number,
    event: MouseEvent<Element>,
    context: PluginHandlerContext<TStore>
  ) => void;
  onCanvasDoubleClick?: (
    event: MouseEvent<Element>,
    context: PluginHandlerContext<TStore>
  ) => void;
  keyboardShortcuts?: CanvasShortcutMap;
  overlays?: PluginUIContribution[];
  canvasLayers?: CanvasLayerContribution[];
  panels?: PluginUIContribution[];
  actions?: PluginActionContribution[];
  /**
   * Panels contributed to other plugins.
   * Example: smoothBrush plugin can contribute a panel to the 'edit' plugin.
   */
  relatedPluginPanels?: PluginPanelContribution[];
  slices?: PluginSliceFactory<TStore>[];
  /**
   * Public API factory exposed by the plugin for use by other parts of the application.
   * This allows plugins to expose functionality without coupling to the store.
   */
  createApi?: PluginApiFactory<TStore>;
  /**
   * React hooks that should be mounted when this plugin is active.
   * Hooks receive a context object with canvas utilities (SVG ref, viewport, etc).
   * Use this for plugins that need to attach DOM listeners or manage complex state.
   */
  hooks?: PluginHookContribution[];
  /**
   * Expandable panel component shown at bottom when sidebar is not pinned.
   * This panel provides quick access to plugin-specific controls.
   */
  expandablePanel?: ComponentType;
  /**
   * Lifecycle method called when the plugin is registered.
   * Can be used to register global listeners, modifiers, etc.
   * Returns a cleanup function called when the plugin is unregistered.
   */
  init?: (context: PluginHandlerContext<TStore>) => (() => void) | void;
}
