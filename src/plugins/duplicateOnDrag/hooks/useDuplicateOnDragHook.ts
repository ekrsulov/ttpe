import type { PluginHooksContext } from '../../../types/plugins';
import { useDuplicateOnDrag } from './useDuplicateOnDrag';

/**
 * Hook wrapper for duplicate on drag functionality.
 * This is registered as a plugin hook contribution.
 * 
 * This hook is always active (not tied to a specific tool being active)
 * and listens for Command+Drag gestures to duplicate elements.
 */
export function useDuplicateOnDragHook(context: PluginHooksContext): void {
  useDuplicateOnDrag({
    svgRef: context.svgRef,
    currentMode: context.activePlugin || 'select',
    screenToCanvas: context.screenToCanvas,
  });
}
