import { Canvas } from './canvas/Canvas';
import { Sidebar } from './sidebar/Sidebar';
import { TopActionBar } from './ui/TopActionBar';
import { BottomActionBar } from './ui/BottomActionBar';
import { VirtualShiftButton } from './ui/VirtualShiftButton';
import { MinimapPanel } from './plugins/minimap/MinimapPanel';
import { useCanvasStore } from './store/canvasStore';
import './App.css';
import type { CSSProperties } from 'react';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useColorMode } from '@chakra-ui/react';
import type { CanvasElement } from './types';
import { CurvesControllerProvider } from './plugins/curves/CurvesControllerContext';
import { DEFAULT_STROKE_COLOR_DARK, DEFAULT_STROKE_COLOR_LIGHT } from './utils/defaultColors';

function App() {
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const setMode = useCanvasStore(state => state.setMode);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const grid = useCanvasStore(state => state.grid);
  const { colorMode } = useColorMode();
  const selectedPaths = useMemo(() => {
    const elements = useCanvasStore.getState().elements;
    return elements.filter((el: CanvasElement) => selectedIds.includes(el.id) && el.type === 'path');
  }, [selectedIds]);
  
  // Detect iOS devices
  const isIOS = useMemo(() => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), []);
  
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

  // Prevent iOS back swipe from left edge
  useEffect(() => {
    if (!isIOS) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch && touch.clientX < 20) { // 20px from left edge
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isIOS]);

  useEffect(() => {
    const targetStrokeColor = colorMode === 'dark'
      ? DEFAULT_STROKE_COLOR_DARK
      : DEFAULT_STROKE_COLOR_LIGHT;
    const state = useCanvasStore.getState();
    const currentDefault = state.settings.defaultStrokeColor;

    if (currentDefault === targetStrokeColor) {
      return;
    }

    // Update default stroke color
    state.updateSettings?.({ defaultStrokeColor: targetStrokeColor });

    // Update pencil state if it matches the old default
    if (state.pencil && state.updatePencilState && state.pencil.strokeColor === currentDefault) {
      state.updatePencilState({ strokeColor: targetStrokeColor });
    }

    // Update all existing path elements that have the old default color
    const oldDefaultColor = colorMode === 'dark' ? DEFAULT_STROKE_COLOR_LIGHT : DEFAULT_STROKE_COLOR_DARK;
    state.elements.forEach(element => {
      if (element.type === 'path') {
        const pathData = element.data as any;
        if (pathData.strokeColor === oldDefaultColor) {
          state.updateElement(element.id, {
            data: {
              ...pathData,
              strokeColor: targetStrokeColor
            }
          });
        }
      }
    });
  }, [colorMode]);

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
