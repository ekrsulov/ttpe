import type { ComponentType, PointerEvent } from 'react';
import type { StoreApi } from 'zustand';
import type { Point } from '.';

export interface PluginUIContribution<TProps = Record<string, unknown>> {
  id: string;
  component: ComponentType<TProps>;
  placement?: 'tool' | 'global';
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
  panels?: PluginUIContribution[];
  actions?: PluginActionContribution[];
  slices?: PluginSliceFactory<TStore>[];
}
