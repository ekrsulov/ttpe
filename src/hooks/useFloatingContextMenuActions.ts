import { useMemo } from 'react';
import { useGroupActions } from './useGroupActions';
import { useAlignmentActions } from './useAlignmentActions';
import { useClipboardActions } from './useClipboardActions';
import { useEnabledPlugins } from './useEnabledPlugins';
import type { FloatingContextMenuAction } from '../types/plugins';
import type { SelectionContextInfo } from '../types/selection';
import { pluginManager } from '../utils/pluginManager';

/**
 * Hook to determine the selection context and provide appropriate actions
 * for the floating context menu.
 * 
 * This is a simplified version that composes smaller specialized hooks.
 */
export function useFloatingContextMenuActions(
  context: SelectionContextInfo | null
): FloatingContextMenuAction[] {
  // Subscribe to enabledPlugins to trigger re-render when plugins are toggled
  useEnabledPlugins();

  // Get specialized action sets
  const { actions: groupActions } = useGroupActions(context);
  const alignmentActions = useAlignmentActions(context);
  const clipboardActions = useClipboardActions(context);

  // Get plugin-contributed actions
  const pluginActions = useMemo(() => {
    if (!context) return [];

    const actions: FloatingContextMenuAction[] = [];
    pluginManager.getRegisteredTools().forEach(plugin => {
      if (plugin.contextMenuActions) {
        plugin.contextMenuActions.forEach(contribution => {
          const action = contribution.action(context);
          if (action) {
            actions.push(action);
          }
        });
      }
    });

    return actions;
  }, [context]);

  // Compose all actions based on context type
  const actions = useMemo<FloatingContextMenuAction[]>(() => {
    if (!context) return [];

    switch (context.type) {
      case 'multiselection':
        return [
          ...alignmentActions,
          ...pluginActions,
          ...groupActions,
          ...clipboardActions,
        ];

      case 'group':
        return [
          ...alignmentActions,
          ...pluginActions,
          ...groupActions,
          ...clipboardActions,
        ];

      case 'path':
        return [
          ...alignmentActions,
          ...pluginActions,
          ...groupActions,
          ...clipboardActions,
        ];

      case 'subpath':
        return [
          ...alignmentActions,
          ...pluginActions,
          ...clipboardActions,
        ];

      case 'point-anchor-m':
      case 'point-anchor-l':
      case 'point-anchor-c':
      case 'point-control':
        return [
          ...alignmentActions,
          ...pluginActions,
        ];

      default:
        return [];
    }
  }, [context, alignmentActions, pluginActions, groupActions, clipboardActions]);

  return actions;
}
