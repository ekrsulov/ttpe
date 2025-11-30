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
// Plugin slices are now registered dynamically through PluginManager
// Static plugin imports have been removed to decouple the core store from specific plugins


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
// Extended Canvas Store - includes plugin slices for type safety
// Plugins will extend this dynamically at runtime
export type CanvasStore = CoreCanvasStore & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any


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
    version: 2,
    migrate: (persistedState: any, _version: number) => {
      // Force dialog closed in persisted state before applying
      if (persistedState && persistedState.pluginSelector) {
        persistedState.pluginSelector.isDialogOpen = false;
      }
      // Force sidebar closed in persisted state to prevent blocking UI (especially in tests)
      if (persistedState) {
        persistedState.isSidebarOpen = false;
      }
      return persistedState;
    },
    partialize: (state: CanvasStore) => {
      const { ...rest } = state;

      // Create a shallow copy of the state to modify for persistence
      const persistedState = { ...rest };

      // If pluginSelector state exists, modify it to ensure dialog is closed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((persistedState as any).pluginSelector) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (persistedState as any).pluginSelector = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(persistedState as any).pluginSelector,
          isDialogOpen: false, // Force dialog to be closed in persisted state
        };
      }

      // Force sidebar closed in persisted state to prevent blocking UI (especially in tests)
      persistedState.isSidebarOpen = false;

      return persistedState;
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

  // Deep merge instead of replace to preserve persisted state
  const currentState = storeApi.getState();
  const merged: Partial<CanvasStore> = {};

  keys.forEach((key) => {
    const currentValue = currentState[key];
    const newValue = partial[key];

    // If both are objects (and not functions), deep merge them
    if (
      currentValue &&
      typeof currentValue === 'object' &&
      !Array.isArray(currentValue) &&
      newValue &&
      typeof newValue === 'object' &&
      !Array.isArray(newValue)
    ) {
      // Deep merge object properties
      const mergedObject: Record<string, unknown> = { ...currentValue };
      const newObject = newValue as Record<string, unknown>;

      Object.keys(newObject).forEach((prop) => {
        const currentProp = (currentValue as Record<string, unknown>)[prop];
        const newProp = newObject[prop];

        // Special case: if new value is an empty array and current value is a non-empty array,
        // keep the current value (this preserves persisted state)
        if (
          Array.isArray(newProp) &&
          newProp.length === 0 &&
          Array.isArray(currentProp) &&
          currentProp.length > 0
        ) {
          mergedObject[prop] = currentProp;
        } else {
          mergedObject[prop] = newProp;
        }
      });

      merged[key] = mergedObject as CanvasStore[keyof CanvasStore];
    } else {
      merged[key] = newValue;
    }
  });

  storeApi.setState(merged as Partial<CanvasStore>);

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
