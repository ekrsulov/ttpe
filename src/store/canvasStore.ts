import { create } from 'zustand';
import type { StoreApi } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import type { PluginSliceFactory } from '../types/plugins';
import isDeepEqual from 'fast-deep-equal';

// Import only core structural slices
import { createBaseSlice, type BaseSlice } from './slices/baseSlice';
import { createViewportSlice, type ViewportSlice } from './slices/features/viewportSlice';
import { createSelectionSlice, type SelectionSlice } from './slices/features/selectionSlice';
import { createGroupSlice, type GroupSlice } from './slices/features/groupSlice';
import { createOrderSlice, type OrderSlice } from './slices/features/orderSlice';
import { createArrangeSlice, type ArrangeSlice } from './slices/features/arrangeSlice';
import { createUiSlice, type UiSlice } from './slices/uiSlice';

// Plugin slices are now registered dynamically through PluginManager
// Import plugin types for backwards compatibility
import type { PencilPluginSlice } from '../plugins/pencil/slice';
import type { TextPluginSlice } from '../plugins/text/slice';
import type { ShapePluginSlice } from '../plugins/shape/slice';
import type { TransformationPluginSlice } from '../plugins/transformation/slice';
import type { EditPluginSlice } from '../plugins/edit/slice';
import type { SubpathPluginSlice } from '../plugins/subpath/slice';
import type { OpticalAlignmentSlice } from '../plugins/opticalAlignment/slice';
import type { CurvesPluginSlice } from '../plugins/curves/slice';
import type { GuidelinesPluginSlice } from '../plugins/guidelines/slice';
import type { GridPluginSlice } from '../plugins/grid/slice';

// Debounce function to implement cool-off period
function debounce<T extends (...args: never[]) => void>(
  func: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  }) as T;
}

// Core Canvas Store - only structural slices
export type CoreCanvasStore = BaseSlice &
  ViewportSlice &
  SelectionSlice &
  GroupSlice &
  OrderSlice &
  ArrangeSlice &
  UiSlice;

// Extended Canvas Store - includes plugin slices for type safety
// Plugins will extend this dynamically at runtime
export type CanvasStore = CoreCanvasStore &
  Partial<PencilPluginSlice> &
  Partial<TextPluginSlice> &
  Partial<ShapePluginSlice> &
  Partial<TransformationPluginSlice> &
  Partial<EditPluginSlice> &
  Partial<SubpathPluginSlice> &
  Partial<OpticalAlignmentSlice> &
  Partial<CurvesPluginSlice> &
  Partial<GuidelinesPluginSlice> &
  Partial<GridPluginSlice>;

// Create the store with core slices only - plugins will register dynamically
export const useCanvasStore = create<CanvasStore>()(
  persist(
    temporal(
      (set, get, api) => ({
        // Core structural slices only
        ...createBaseSlice(set, get, api),
        ...createViewportSlice(set, get, api),
        ...createSelectionSlice(set, get, api),
        ...createGroupSlice(set, get, api),
        ...createOrderSlice(set, get, api),
        ...createArrangeSlice(set, get, api),
        ...createUiSlice(set, get, api),

        // Plugin slices are now registered dynamically through registerPluginSlices
        // Cross-slice actions have been moved to their respective plugins
      }),
      {
        // Zundo temporal options
        limit: 50, // Keep last 50 states
        partialize: (state) => ({
          elements: state.elements,
          selectedIds: state.selectedIds,
          viewport: state.viewport,
        }),
        equality: (pastState, currentState) => isDeepEqual(pastState, currentState),
        // Cool-off period: debounce state changes to prevent too many history entries
        // during rapid events like drawing or moving
        handleSet: (handleSet) =>
          debounce<typeof handleSet>((state) => {
            handleSet(state);
          }, 100), // 100ms cool-off period
      }
    ), {
    name: 'canvas-app-state',
    partialize: (state: CanvasStore) => {
      const { ...rest } = state;
      return rest;
    }
  }
  )
);

export type CanvasStoreApi = StoreApi<CanvasStore>;

export const canvasStoreApi: CanvasStoreApi = useCanvasStore as unknown as CanvasStoreApi;

type CanvasPluginSlice = ReturnType<PluginSliceFactory<CanvasStore>>;

const pluginSliceCleanups = new Map<string, Array<() => void>>();

const applyPluginSlice = (
  storeApi: CanvasStoreApi,
  partial: Partial<CanvasStore>
): (() => void) => {
  const previousValues: Partial<Record<keyof CanvasStore, CanvasStore[keyof CanvasStore] | null>> = {};
  const keys = Object.keys(partial) as (keyof CanvasStore)[];

  keys.forEach((key) => {
    previousValues[key] = storeApi.getState()[key];
  });

  storeApi.setState(partial as Partial<CanvasStore>);

  return () => {
    const restore: Partial<Record<keyof CanvasStore, CanvasStore[keyof CanvasStore] | null>> = {};
    keys.forEach((key) => {
      restore[key] = previousValues[key];
    });
    storeApi.setState(restore as Partial<CanvasStore>);
  };
};

export const registerPluginSlices = (
  storeApi: CanvasStoreApi,
  pluginId: string,
  contributions: CanvasPluginSlice[]
): void => {
  if (contributions.length === 0) {
    return;
  }

  unregisterPluginSlices(storeApi, pluginId);

  const cleanups: Array<() => void> = [];

  contributions.forEach(({ state, cleanup }) => {
    cleanups.push(applyPluginSlice(storeApi, state));
    if (cleanup) {
      cleanups.push(() => cleanup(storeApi.setState, storeApi.getState, storeApi));
    }
  });

  pluginSliceCleanups.set(pluginId, cleanups);
};

export function unregisterPluginSlices(_storeApi: CanvasStoreApi, pluginId: string): void {
  const cleanups = pluginSliceCleanups.get(pluginId);
  if (!cleanups) {
    return;
  }

  [...cleanups].reverse().forEach((cleanup) => {
    cleanup();
  });

  pluginSliceCleanups.delete(pluginId);
}
