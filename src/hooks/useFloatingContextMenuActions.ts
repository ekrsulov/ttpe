import { useMemo } from 'react';
import { useGroupActions } from './useGroupActions';
import { useAlignmentActions } from './useAlignmentActions';
import { useClipboardActions } from './useClipboardActions';
import { useEnabledPlugins } from './useEnabledPlugins';
import type { FloatingContextMenuAction } from '../types/plugins';
import type { SelectionContextInfo } from '../types/selection';
import { pluginManager } from '../utils/pluginManager';

/**
 * Configuration mapping selection types to their available action categories.
 * This replaces the repetitive switch-case with a declarative approach.
 */
const CONTEXT_ACTION_CONFIG: Record<string, { alignment: boolean; plugin: boolean; group: boolean; clipboard: boolean }> = {
  'multiselection': { alignment: true, plugin: true, group: true, clipboard: true },
  'group': { alignment: true, plugin: true, group: true, clipboard: true },
  'path': { alignment: true, plugin: true, group: true, clipboard: true },
  'subpath': { alignment: true, plugin: true, group: false, clipboard: true },
  'point-anchor-m': { alignment: true, plugin: true, group: false, clipboard: false },
  'point-anchor-l': { alignment: true, plugin: true, group: false, clipboard: false },
  'point-anchor-c': { alignment: true, plugin: true, group: false, clipboard: false },
  'point-control': { alignment: true, plugin: true, group: false, clipboard: false },
};

/**
 * Hook to determine the selection context and provide appropriate actions
 * for the floating context menu.
 * 
 * This is a simplified version that composes smaller specialized hooks
 * and uses a declarative configuration for action composition.
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

  // Compose all actions based on context type using config
  const actions = useMemo<FloatingContextMenuAction[]>(() => {
    if (!context) return [];

    const config = CONTEXT_ACTION_CONFIG[context.type];
    if (!config) return [];

    const result: FloatingContextMenuAction[] = [];
    
    if (config.alignment) result.push(...alignmentActions);
    if (config.plugin) result.push(...pluginActions);
    if (config.group) result.push(...groupActions);
    if (config.clipboard) result.push(...clipboardActions);

    return result;
  }, [context, alignmentActions, pluginActions, groupActions, clipboardActions]);

  return actions;
}
