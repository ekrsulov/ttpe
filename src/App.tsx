import { Canvas } from './canvas/Canvas';
import { Sidebar } from './sidebar/Sidebar';
import { TopActionBar } from './ui/TopActionBar';
import { BottomActionBar } from './ui/BottomActionBar';
import { ExpandableToolPanel } from './ui/ExpandableToolPanel';
import { VirtualShiftButton } from './ui/VirtualShiftButton';
import { useCanvasStore } from './store/canvasStore';
import './App.css';
import type { CSSProperties } from 'react';
import { useCallback, useEffect } from 'react';

import { pluginManager } from './utils/pluginManager';
import { useMemo as useReactMemo } from 'react';
import { useSvgImport } from './hooks/useSvgImport';
import { useColorModeSync } from './hooks/useColorModeSync';
import { useIOSSupport } from './hooks/useIOSSupport';
import { DEFAULT_MODE } from './constants';

function App() {
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const setMode = useCanvasStore(state => state.setMode);
  const { importSvgFiles } = useSvgImport();

  // Get global overlays from plugins
  const globalOverlays = useReactMemo(() => pluginManager.getGlobalOverlays(), []);
  const grid = useCanvasStore(state => state.grid);
  const guidelines = useCanvasStore(state => state.guidelines);

  // iOS support hook (handles detection and back swipe prevention)
  const { isIOS } = useIOSSupport();

  // Color mode sync hook (handles theme changes and element color updates)
  useColorModeSync();

  // Sidebar state from store (single source of truth)
  const sidebarWidth = useCanvasStore(state => state.sidebarWidth);
  const isSidebarPinned = useCanvasStore(state => state.isSidebarPinned);
  const isSidebarOpen = useCanvasStore(state => state.isSidebarOpen);
  const openSidebar = useCanvasStore(state => state.openSidebar);

  // When sidebar closes and is not pinned, if in sidebar panel mode, switch to default mode
  useEffect(() => {
    if (!isSidebarOpen && !isSidebarPinned && pluginManager.isInSidebarPanelMode()) {
      setMode(DEFAULT_MODE);
    }
  }, [isSidebarOpen, isSidebarPinned, setMode]);

  const handleMenuClick = useCallback(() => {
    openSidebar();
  }, [openSidebar]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await importSvgFiles(files, { appendMode: true });
    }
  }, [importSvgFiles]);

  // Calculate effective sidebar width for positioning (only when pinned)
  const effectiveSidebarWidth = isSidebarPinned ? sidebarWidth : 0;

  return (
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          position: 'relative',
          width: '100vw',
          height: '100dvh',
          overflow: 'hidden',
          overscrollBehavior: 'none',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'none',
        } as CSSProperties}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            touchAction: 'pan-x pan-y',
          }}
        >
          <Canvas />
        </div>
        {/* Invisible overlay to prevent iOS back swipe from left edge */}
        {isIOS && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '20px',
              height: '100%',
              zIndex: 9999,
              touchAction: 'none',
              backgroundColor: 'transparent',
            }}
          />
        )}
        <Sidebar />
        <TopActionBar
          activeMode={activePlugin}
          onModeChange={setMode}
          sidebarWidth={effectiveSidebarWidth}
          isSidebarPinned={isSidebarPinned}
          isSidebarOpen={isSidebarOpen}
          onMenuClick={handleMenuClick}
          showGridRulers={(grid?.enabled && grid?.showRulers) || (guidelines?.enabled && guidelines?.manualGuidesEnabled)}
        />
        <BottomActionBar
          sidebarWidth={effectiveSidebarWidth}
        />
        <ExpandableToolPanel activePlugin={activePlugin} sidebarWidth={effectiveSidebarWidth} />
        <VirtualShiftButton
          sidebarWidth={effectiveSidebarWidth}
        />
        {/* Render global overlays from plugins (includes MinimapPanel) */}
        {globalOverlays.map((OverlayComponent, index) => (
          <OverlayComponent key={`global-overlay-${index}`} />
        ))}
      </div>
  );
}

export default App;
