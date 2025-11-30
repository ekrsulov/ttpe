import { useState, useCallback, useMemo } from 'react';
import { pluginManager } from '../utils/pluginManager';
import { useCanvasStore } from '../store/canvasStore';
import { useLocalStorage } from './useLocalStorage';

// Tool mode type - any string representing a tool ID
type ToolMode = string;

// Number of dynamic tools to show in mobile
const MOBILE_VISIBLE_TOOLS = 2;

// localStorage key for tool usage tracking
const TOOL_USAGE_KEY = 'ttpe_tool_usage';

interface ToolUsage {
  [key: string]: number; // toolId -> usage count
}

/**
 * Hook to manage dynamic tool selection based on usage patterns
 */
export const useDynamicTools = (activeMode: string | null) => {
  const [toolUsage, setToolUsage, resetToolUsage] = useLocalStorage<ToolUsage>(TOOL_USAGE_KEY, {});
  const [showExtraTools, setShowExtraTools] = useState(false);

  // Get enabled plugins from store - wrapped in its own selector to avoid dependency issues
  const pluginSelectorState = useCanvasStore(
    (state) => (state as Record<string, unknown>).pluginSelector as { enabledPlugins: string[] } | undefined
  );
  
  // Memoize enabled plugins to avoid changing on every render
  const enabledPlugins = useMemo(() => {
    return pluginSelectorState?.enabledPlugins ?? [];
  }, [pluginSelectorState]);

  // Get tools dynamically from registered plugins
  const allAlwaysShownTools = useMemo(() => pluginManager.getAlwaysShownTools(), []);
  const allDynamicTools = useMemo(() => pluginManager.getDynamicTools(), []);

  // Filter tools based on enabled plugins
  const alwaysShownTools = useMemo(() => {
    const enabledPluginSet = new Set(enabledPlugins.length === 0 ? [] : enabledPlugins);
    return allAlwaysShownTools.filter(tool => 
      enabledPlugins.length === 0 || enabledPluginSet.has(tool)
    );
  }, [allAlwaysShownTools, enabledPlugins]);

  // Filter dynamic tools based on enabled plugins and plugin-defined visibility
  const dynamicTools = useMemo(() => {
    const enabledPluginSet = new Set(enabledPlugins.length === 0 ? [] : enabledPlugins);
    const store = useCanvasStore.getState();
    
    return allDynamicTools.filter(tool => {
      // Check if plugin is visible using plugin-defined isVisible
      if (!pluginManager.isToolVisible(tool, store)) {
        return false;
      }
      
      // Check if plugin is enabled (empty enabledPlugins means all enabled)
      return enabledPlugins.length === 0 || enabledPluginSet.has(tool);
    });
  }, [allDynamicTools, enabledPlugins]);

  // Track tool usage
  const trackToolUsage = useCallback((toolId: ToolMode) => {
    setToolUsage(prev => ({
      ...prev,
      [toolId]: (prev[toolId] || 0) + 1,
    }));
  }, [setToolUsage]);

  // Get the most used dynamic tools for mobile
  const getMobileVisibleTools = useCallback((): ToolMode[] => {
    const sortedTools = dynamicTools
      .map(tool => ({ tool, usage: toolUsage[tool] || 0 }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, MOBILE_VISIBLE_TOOLS)
      .map(({ tool }) => tool);

    let visibleDynamicTools = sortedTools;

    // Always include the active tool in the visible tools
    if (activeMode && !alwaysShownTools.includes(activeMode as ToolMode) && !visibleDynamicTools.includes(activeMode as ToolMode)) {
      // Replace the second most used with the active tool
      visibleDynamicTools = visibleDynamicTools.slice();
      visibleDynamicTools[1] = activeMode as ToolMode;
    }

    return visibleDynamicTools;
  }, [dynamicTools, toolUsage, activeMode, alwaysShownTools]);

  // Get tools that should be shown in the extra tools bar
  const getExtraTools = useCallback((): ToolMode[] => {
    const visibleTools = getMobileVisibleTools();
    return dynamicTools.filter(tool => !visibleTools.includes(tool));
  }, [dynamicTools, getMobileVisibleTools]);

  // Toggle extra tools visibility
  const toggleExtraTools = useCallback(() => {
    setShowExtraTools(prev => !prev);
  }, []);

  return {
    trackToolUsage,
    getMobileVisibleTools,
    getExtraTools,
    showExtraTools,
    toggleExtraTools,
    resetToolUsage,
    alwaysShownTools,
    dynamicTools,
  };
};