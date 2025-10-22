import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { TopActionBar } from './components/ui/TopActionBar';
import { BottomActionBar } from './components/ui/BottomActionBar';
import { VirtualShiftButton } from './components/ui/VirtualShiftButton';
import { MinimapPanel } from './plugins/minimap/MinimapPanel';
import { useCanvasStore } from './store/canvasStore';
import './App.css';
import type { CSSProperties } from 'react';
import { useState, useCallback, useMemo } from 'react';
import type { CanvasElement } from './types';
import { CurvesControllerProvider } from './plugins/curves/CurvesControllerContext';

function App() {
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const setMode = useCanvasStore(state => state.setMode);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const grid = useCanvasStore(state => state.grid);
  const selectedPaths = useMemo(() => {
    const elements = useCanvasStore.getState().elements;
    return elements.filter((el: CanvasElement) => selectedIds.includes(el.id) && el.type === 'path');
  }, [selectedIds]);
  
  // Track sidebar width when pinned (0 when not pinned)
  const [sidebarWidth, setSidebarWidth] = useState(0);
  
  // Track if sidebar is pinned
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  
  // Track if sidebar is open
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Store reference to sidebar open handler
  const [sidebarOpenHandler, setSidebarOpenHandler] = useState<(() => void) | null>(null);

  // Memoized callback to prevent re-renders
  const handleSidebarWidthChange = useCallback((width: number) => {
    setSidebarWidth(width);
  }, []);

  const handleSidebarPinnedChange = useCallback((isPinned: boolean) => {
    setIsSidebarPinned(isPinned);
  }, []);

  const handleSidebarToggleOpen = useCallback((isOpen: boolean) => {
    setIsSidebarOpen(isOpen);
    // When sidebar closes and is not pinned, if in file or settings mode, switch to select
    if (!isOpen && !isSidebarPinned && (activePlugin === 'file' || activePlugin === 'settings')) {
      setMode('select');
    }
  }, [isSidebarPinned, activePlugin, setMode]);

  const handleRegisterOpenHandler = useCallback((openHandler: () => void) => {
    setSidebarOpenHandler(() => openHandler);
  }, []);

  const handleMenuClick = useCallback(() => {
    if (sidebarOpenHandler) {
      sidebarOpenHandler();
    }
  }, [sidebarOpenHandler]);

  return (
    <CurvesControllerProvider>
      <div 
        style={{ 
          position: 'relative', 
          width: '100vw', 
          height: '100dvh', // Dynamic viewport height (adjusts with Safari toolbar)
          overflow: 'hidden',
          // Prevent overscroll/bounce on mobile
          overscrollBehavior: 'none',
          WebkitOverflowScrolling: 'touch',
          // Prevent pull-to-refresh
          touchAction: 'none',
          // NO padding here - let canvas use full height
        } as CSSProperties}
      >
        <div 
          style={{ 
            width: '100%', 
            height: '100%',
            // Allow panning gestures on canvas only
            touchAction: 'pan-x pan-y',
            // Important: no padding to avoid coordinate offset
          }}
        >
          <Canvas />
        </div>
        <Sidebar 
          onWidthChange={handleSidebarWidthChange}
          onPinnedChange={handleSidebarPinnedChange}
          onToggleOpen={handleSidebarToggleOpen}
          onRegisterOpenHandler={handleRegisterOpenHandler}
        />
        <TopActionBar 
          activeMode={activePlugin} 
          onModeChange={setMode}
          sidebarWidth={sidebarWidth}
          isSidebarPinned={isSidebarPinned}
          isSidebarOpen={isSidebarOpen}
          onMenuClick={handleMenuClick}
          selectedPaths={selectedPaths}
          showGridRulers={grid?.enabled && grid?.showRulers}
        />
        <BottomActionBar 
          sidebarWidth={sidebarWidth}
        />
        <VirtualShiftButton 
          sidebarWidth={sidebarWidth}
        />
        <MinimapPanel 
          sidebarWidth={sidebarWidth}
        />
      </div>
    </CurvesControllerProvider>
  );
}

export default App;
