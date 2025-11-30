import { useCanvasStore } from '../store/canvasStore';

/**
 * Hook to subscribe to enabled plugins state.
 * Centralizes the repeated pattern of subscribing to pluginSelector.enabledPlugins
 * across multiple components.
 * 
 * @returns Array of enabled plugin IDs, or empty array if all plugins are enabled
 */
export function useEnabledPlugins(): string[] {
  return useCanvasStore(
    state => (state as Record<string, unknown>).pluginSelector as { enabledPlugins: string[] } | undefined
  )?.enabledPlugins ?? [];
}
