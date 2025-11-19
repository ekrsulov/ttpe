import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ToolMode } from '../config/toolDefinitions';

// Tools that can be dynamically shown/hidden based on usage
export const DYNAMIC_TOOLS: ToolMode[] = ['pencil2', 'curves', 'text', 'shape', 'gridFill', 'trimPath', 'measure'];

// Tools that are always shown regardless of usage patterns or device
export const ALWAYS_SHOWN_TOOLS: ToolMode[] = ['select', 'subpath', 'transformation', 'edit', 'pan'];

// Tool that is always shown (legacy, kept for compatibility)
export const ALWAYS_SHOWN_TOOL: ToolMode = 'text';

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

  // Compute dynamic tools based on grid state
  const dynamicTools = useMemo(() =>
    DYNAMIC_TOOLS.filter(tool => tool !== 'gridFill' || gridEnabled),
    [gridEnabled]
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
    if (activeMode && !ALWAYS_SHOWN_TOOLS.includes(activeMode as ToolMode) && !visibleDynamicTools.includes(activeMode as ToolMode)) {
      // Replace the second most used with the active tool
      visibleDynamicTools = visibleDynamicTools.slice();
      visibleDynamicTools[1] = activeMode as ToolMode;
    }

    return visibleDynamicTools;
  }, [dynamicTools, toolUsage, activeMode]);

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
    alwaysShownTools: ALWAYS_SHOWN_TOOLS,
    dynamicTools,
  };
};