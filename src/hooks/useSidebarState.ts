import { useCallback, useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useResponsive } from './useResponsive';
import { DEFAULT_MODE } from '../constants';
import { pluginManager } from '../utils/pluginManager';

/**
 * Consolidated sidebar state hook.
 * Provides all sidebar-related state and derived actions in one place.
 * 
 * This replaces the need for SidebarContext in most cases, accessing
 * the store directly while still providing the derived actions.
 */
export function useSidebarState() {
  const { isDesktop } = useResponsive();

  // State from store
  const sidebarWidth = useCanvasStore(state => state.sidebarWidth);
  const isSidebarPinned = useCanvasStore(state => state.isSidebarPinned);
  const isSidebarOpen = useCanvasStore(state => state.isSidebarOpen);
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const showFilePanel = useCanvasStore(state => state.showFilePanel);
  const showSettingsPanel = useCanvasStore(state => state.showSettingsPanel);
  const isArrangeExpanded = useCanvasStore(state => state.arrangePanelExpanded);

  // Actions from store
  const setMode = useCanvasStore(state => state.setMode);
  const setShowFilePanel = useCanvasStore(state => state.setShowFilePanel);
  const setShowSettingsPanel = useCanvasStore(state => state.setShowSettingsPanel);
  const setIsSidebarPinned = useCanvasStore(state => state.setIsSidebarPinned);
  const setIsArrangeExpanded = useCanvasStore(state => state.setArrangePanelExpanded);

  // Derived: effective sidebar width (0 when not pinned)
  const effectiveSidebarWidth = isSidebarPinned ? sidebarWidth : 0;

  // Derived: is in special panel mode
  const isInSpecialPanelMode = showFilePanel || showSettingsPanel;

  // Derived action: handle tool/panel clicks
  const handleToolClick = useCallback((toolName: string) => {
    if (toolName === 'file') {
      if (showFilePanel) {
        setShowFilePanel(false);
        setMode(DEFAULT_MODE);
      } else {
        setShowFilePanel(true);
        setShowSettingsPanel(false);
        setMode('file');
      }
    } else if (toolName === 'settings') {
      if (showSettingsPanel) {
        setShowSettingsPanel(false);
        setMode(DEFAULT_MODE);
      } else {
        setShowSettingsPanel(true);
        setShowFilePanel(false);
        setMode('settings');
      }
    } else {
      setShowFilePanel(false);
      setShowSettingsPanel(false);
      setMode(toolName);
    }
  }, [showFilePanel, showSettingsPanel, setShowFilePanel, setShowSettingsPanel, setMode]);

  // Derived action: toggle pin
  const handleTogglePin = useCallback(() => {
    setIsSidebarPinned(!isSidebarPinned);
  }, [isSidebarPinned, setIsSidebarPinned]);

  // Check if active plugin is a sidebar panel mode
  const isPluginInSidebarMode = useMemo(() => {
    return pluginManager.isInSidebarPanelMode();
  }, [activePlugin]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Layout state
    sidebarWidth,
    effectiveSidebarWidth,
    isSidebarPinned,
    isSidebarOpen,
    isDesktop,

    // Panel state
    activePlugin,
    showFilePanel,
    showSettingsPanel,
    isInSpecialPanelMode,
    isArrangeExpanded,
    isPluginInSidebarMode,

    // Actions
    setMode,
    handleToolClick,
    handleTogglePin,
    setIsArrangeExpanded,
  };
}

/**
 * Simplified toolbar position calculation.
 * Returns CSS properties for centering toolbars with sidebar offset.
 */
export function useToolbarPositionStyles(effectiveSidebarWidth: number) {
  return useMemo(() => {
    const isPinned = effectiveSidebarWidth > 0;
    
    return {
      left: isPinned ? '0' : '50%',
      right: isPinned ? `${effectiveSidebarWidth}px` : 'auto',
      transform: isPinned ? 'none' : 'translateX(-50%)',
      isPinned,
    };
  }, [effectiveSidebarWidth]);
}
