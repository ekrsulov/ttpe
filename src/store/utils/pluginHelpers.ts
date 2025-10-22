/**
 * Plugin State Helpers
 * 
 * Utilities for safely accessing optional plugin state
 */

import type { CanvasStore } from '../types';

/**
 * Type guard to check if a plugin slice exists
 */
export function hasPluginSlice<K extends keyof CanvasStore>(
  state: CanvasStore,
  sliceKey: K
): state is CanvasStore & Required<Pick<CanvasStore, K>> {
  return state[sliceKey] !== undefined && state[sliceKey] !== null;
}

/**
 * Safely get a plugin state with a default value
 */
export function getPluginState<K extends keyof CanvasStore>(
  state: CanvasStore,
  sliceKey: K,
  defaultValue: NonNullable<CanvasStore[K]>
): NonNullable<CanvasStore[K]> {
  return (state[sliceKey] ?? defaultValue) as NonNullable<CanvasStore[K]>;
}

/**
 * Safely call a plugin method if it exists
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function callPluginMethod<T extends (...args: any[]) => any>(
  method: T | undefined,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  if (typeof method === 'function') {
    return method(...args);
  }
  return undefined;
}

/**
 * Get plugin state or throw an error if not available
 * Use this when a plugin is required for functionality
 */
export function requirePluginSlice<K extends keyof CanvasStore>(
  state: CanvasStore,
  sliceKey: K,
  pluginName: string = String(sliceKey)
): NonNullable<CanvasStore[K]> {
  if (!hasPluginSlice(state, sliceKey)) {
    throw new Error(`Plugin "${pluginName}" is required but not loaded`);
  }
  return state[sliceKey] as NonNullable<CanvasStore[K]>;
}
