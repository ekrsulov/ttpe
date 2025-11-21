import { useState, useEffect, useCallback, useMemo } from 'react';
import { pluginManager } from '../utils/pluginManager';

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
export const useDynamicTools = (activeMode: string | null, gridEnabled: boolean = false) => {
  const [toolUsage, setToolUsage] = useState<ToolUsage>({});
  const [showExtraTools, setShowExtraTools] = useState(false);

  // Get tools dynamically from registered plugins
  const alwaysShownTools = useMemo(() => pluginManager.getAlwaysShownTools(), []);
  const allDynamicTools = useMemo(() => pluginManager.getDynamicTools(), []);

  // Compute dynamic tools based on grid state
  const dynamicTools = useMemo(() =>
    allDynamicTools.filter(tool => tool !== 'gridFill' || gridEnabled),
    [allDynamicTools, gridEnabled]
  );

  // Load tool usage from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TOOL_USAGE_KEY);
      if (stored) {
        setToolUsage(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load tool usage from localStorage:', error);
    }
  }, []);

  // Save tool usage to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(TOOL_USAGE_KEY, JSON.stringify(toolUsage));
    } catch (error) {
      console.warn('Failed to save tool usage to localStorage:', error);
    }
  }, [toolUsage]);

  // Track tool usage
  const trackToolUsage = useCallback((toolId: ToolMode) => {
    setToolUsage(prev => ({
      ...prev,
      [toolId]: (prev[toolId] || 0) + 1,
    }));
  }, []);

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

  // Reset tool usage (useful for testing)
  const resetToolUsage = useCallback(() => {
    setToolUsage({});
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