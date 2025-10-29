import type { ComponentType, PointerEvent, MouseEvent, TouchEvent, ReactNode } from 'react';
import type { StoreApi } from 'zustand';
import type { Point, CanvasElement } from '.';
import type { CanvasControllerValue } from '../canvas/controller/CanvasControllerContext';
import type { ShapeCreationState } from '../hooks/useCanvasShapeCreation';
import type { TransformFeedback } from '../canvas/interactions/TransformController';
import type { Bounds } from '../utils/boundsUtils';
import type { EditPluginSlice } from '../plugins/edit/slice';
import type { CanvasEventBus } from '../canvas/CanvasEventBusContext';

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

export interface CanvasLayerContext extends CanvasControllerValue {
  canvasSize: { width: number; height: number };
  isSelecting: boolean;
  selectionStart: Point | null;
  selectionEnd: Point | null;
  selectedGroupBounds: Array<{ id: string; bounds: Bounds }>;
  isCreatingShape: boolean;
  shapeStart: Point | null;
  shapeEnd: Point | null;
  shapeFeedback: ShapeCreationState['feedback'];
  isSmoothBrushActive: boolean;
  smoothBrush: EditPluginSlice['smoothBrush'];
  smoothBrushCursor: Point;
  addPointMode?: EditPluginSlice['addPointMode'];
  dragPosition: Point | null;
  isDragging: boolean;
  transformFeedback: TransformFeedback;
  getElementBounds: (element: CanvasElement) => Bounds | null;
  handleTransformationHandlerPointerDown: (event: PointerEvent, elementId: string, handler: string) => void;
  handleTransformationHandlerPointerUp: (event: PointerEvent) => void;
  handleSubpathDoubleClick: (elementId: string, subpathIndex: number, event: MouseEvent<SVGPathElement>) => void;
  handleSubpathTouchEnd: (elementId: string, subpathIndex: number, event: TouchEvent<SVGPathElement>) => void;
  setDragStart: (point: Point | null) => void;
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

export interface PluginHandlerHelpers {
  isSmoothBrushActive?: boolean;
  beginSelectionRectangle?: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void;
  startShapeCreation?: (point: Point) => void;
}

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
