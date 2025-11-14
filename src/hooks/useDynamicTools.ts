import { useState, useEffect, useCallback } from 'react';
import type { ToolMode } from '../config/toolDefinitions';

// Tools that can be dynamically shown/hidden based on usage
export const DYNAMIC_TOOLS: ToolMode[] = ['pencil', 'curves', 'text', 'shape', 'gridFill', 'trimPath'];

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
export const useDynamicTools = () => {
  const [toolUsage, setToolUsage] = useState<ToolUsage>({});
  const [showExtraTools, setShowExtraTools] = useState(false);

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
    const sortedTools = DYNAMIC_TOOLS
      .map(tool => ({ tool, usage: toolUsage[tool] || 0 }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, MOBILE_VISIBLE_TOOLS)
      .map(({ tool }) => tool);

    return sortedTools;
  }, [toolUsage]);

  // Get tools that should be shown in the extra tools bar
  const getExtraTools = useCallback((): ToolMode[] => {
    const visibleTools = getMobileVisibleTools();
    return DYNAMIC_TOOLS.filter(tool => !visibleTools.includes(tool));
  }, [getMobileVisibleTools]);

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
    dynamicTools: DYNAMIC_TOOLS,
  };
};