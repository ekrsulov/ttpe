import type { PluginHooksContext } from '../../../types/plugins';
import { useDuplicateOnDrag } from './useDuplicateOnDrag';
import { pluginManager } from '../../../utils/pluginManager';
import { useCanvasStore } from '../../../store/canvasStore';

/**
 * Hook wrapper for duplicate on drag functionality.
 * This is registered as a plugin hook contribution.
 * 
 * This hook is always active (not tied to a specific tool being active)
 * and listens for Command+Drag gestures to duplicate elements.
 * Only works if the plugin is enabled.
 */
export function useDuplicateOnDragHook(context: PluginHooksContext): void {
  // Subscribe to enabledPlugins to re-evaluate when plugins are toggled
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useCanvasStore(state => (state as any).pluginManager?.enabledPlugins ?? []);

  const isEnabled = pluginManager.isPluginEnabled('duplicate-on-drag');

  useDuplicateOnDrag({
    svgRef: context.svgRef,
    currentMode: context.activePlugin || 'select',
    screenToCanvas: context.screenToCanvas,
    isEnabled,
  });
}
