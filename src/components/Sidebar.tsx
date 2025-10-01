import React, { useState, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { SidebarToolGrid } from './sidebar/SidebarToolGrid';
import { SidebarPanels } from './sidebar/SidebarPanels';
import { SidebarFooter } from './sidebar/SidebarFooter';
import { PANEL_STYLES } from './ui/PanelComponents';

export const Sidebar: React.FC = () => {
  // Use specific selectors instead of destructuring the entire store
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const setMode = useCanvasStore(state => state.setMode);
  const smoothBrush = useCanvasStore(state => state.smoothBrush);
  const pathSimplification = useCanvasStore(state => state.pathSimplification);
  const pathRounding = useCanvasStore(state => state.pathRounding);
  const selectedCommands = useCanvasStore(state => state.selectedCommands);
  const updateSmoothBrush = useCanvasStore(state => state.updateSmoothBrush);
  const updatePathSimplification = useCanvasStore(state => state.updatePathSimplification);
  const updatePathRounding = useCanvasStore(state => state.updatePathRounding);
  const applySmoothBrush = useCanvasStore(state => state.applySmoothBrush);
  const applyPathSimplification = useCanvasStore(state => state.applyPathSimplification);
  const applyPathRounding = useCanvasStore(state => state.applyPathRounding);
  const activateSmoothBrush = useCanvasStore(state => state.activateSmoothBrush);
  const deactivateSmoothBrush = useCanvasStore(state => state.deactivateSmoothBrush);
  const resetSmoothBrush = useCanvasStore(state => state.resetSmoothBrush);
  
  // Local state for panels
  const [showFilePanel, setShowFilePanel] = useState<boolean>(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
  const [isArrangeExpanded, setIsArrangeExpanded] = useState(true);

  // Handle Escape key to return to select mode when in file/settings mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (showFilePanel || showSettingsPanel)) {
        setShowFilePanel(false);
        setShowSettingsPanel(false);
        setMode('select');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFilePanel, showSettingsPanel, setMode]);

  // Handlers for special panel buttons
  const handleToolClick = (toolName: string) => {
    if (toolName === 'file') {
      if (showFilePanel) {
        // If file panel is open, close it and return to select
        setShowFilePanel(false);
        setMode('select');
      } else {
        // Open file panel, close everything else, and set to file mode
        setShowFilePanel(true);
        setShowSettingsPanel(false);
        setMode('file');
      }
    } else if (toolName === 'settings') {
      if (showSettingsPanel) {
        // If settings panel is open, close it and return to select
        setShowSettingsPanel(false);
        setMode('select');
      } else {
        // Open settings panel, close everything else, and set to settings mode
        setShowSettingsPanel(true);
        setShowFilePanel(false);
        setMode('settings');
      }
    } else {
      // Regular plugin mode - close both special panels
      setShowFilePanel(false);
      setShowSettingsPanel(false);
      setMode(toolName);
    }
  };

  return (
    <div style={PANEL_STYLES.sidebarContainer}>
      {/* Tools Grid */}
      <SidebarToolGrid 
        activePlugin={activePlugin}
        setMode={setMode}
        onToolClick={handleToolClick}
        showFilePanel={showFilePanel}
        showSettingsPanel={showSettingsPanel}
      />

      {/* Main Panels */}
      <SidebarPanels
        activePlugin={activePlugin}
        showFilePanel={showFilePanel}
        showSettingsPanel={showSettingsPanel}
        smoothBrush={smoothBrush}
        pathSimplification={pathSimplification}
        pathRounding={pathRounding}
        selectedCommands={selectedCommands}
        updateSmoothBrush={updateSmoothBrush}
        updatePathSimplification={updatePathSimplification}
        updatePathRounding={updatePathRounding}
        applySmoothBrush={applySmoothBrush}
        applyPathSimplification={applyPathSimplification}
        applyPathRounding={applyPathRounding}
        activateSmoothBrush={activateSmoothBrush}
        deactivateSmoothBrush={deactivateSmoothBrush}
        resetSmoothBrush={resetSmoothBrush}
      />

      {/* Footer with ArrangePanel and SelectPanel - hide in special panel mode */}
      {!showFilePanel && !showSettingsPanel && (
        <SidebarFooter
          isArrangeExpanded={isArrangeExpanded}
          setIsArrangeExpanded={setIsArrangeExpanded}
        />
      )}
    </div>
  );
};