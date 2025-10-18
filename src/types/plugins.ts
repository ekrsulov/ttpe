import type { ComponentType, PointerEvent, MouseEvent, ReactNode } from 'react';
import type { StoreApi } from 'zustand';
import type { Point, CanvasElement } from '.';
import type { CanvasControllerValue } from '../canvas/controller/CanvasControllerContext';
import type { ShapeCreationState } from '../hooks/useCanvasShapeCreation';
import type { TransformFeedback } from '../canvas/interactions/TransformController';
import type { Bounds } from '../utils/boundsUtils';
import type { EditPluginSlice } from '../plugins/edit/slice';

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
  dragPosition: Point | null;
  isDragging: boolean;
  transformFeedback: TransformFeedback;
  getElementBounds: (element: CanvasElement) => Bounds | null;
  getTransformedBounds: (element: CanvasElement) => Bounds | null;
  handleTransformationHandlerPointerDown: (event: PointerEvent, elementId: string, handler: string) => void;
  handleTransformationHandlerPointerUp: (event: PointerEvent) => void;
  handleSubpathDoubleClick: (elementId: string, subpathIndex: number, event: MouseEvent<SVGPathElement>) => void;
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
    isSmoothBrushActive: boolean,
    beginSelectionRectangle: (point: Point, shiftKey?: boolean, subpathMode?: boolean) => void,
    startShapeCreation: (point: Point) => void
  ) => void;
  keyboardShortcuts?: Record<string, (event: KeyboardEvent) => void>;
  overlays?: PluginUIContribution[];
  canvasLayers?: CanvasLayerContribution[];
  panels?: PluginUIContribution[];
  actions?: PluginActionContribution[];
  slices?: PluginSliceFactory<TStore>[];
}
