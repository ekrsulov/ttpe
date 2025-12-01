import { Canvas } from './canvas/Canvas';
import { Sidebar } from './sidebar/Sidebar';
import { TopActionBar } from './ui/TopActionBar';
import { BottomActionBar } from './ui/BottomActionBar';
import { ExpandableToolPanel } from './ui/ExpandableToolPanel';
import { VirtualShiftButton } from './ui/VirtualShiftButton';
import { GlobalOverlays } from './ui/GlobalOverlays';
import { useCanvasStore } from './store/canvasStore';
import './App.css';
import type { CSSProperties } from 'react';
import { useCallback, useEffect } from 'react';

import { pluginManager } from './utils/pluginManager';
import { useSvgImport } from './hooks/useSvgImport';
import { useColorModeSync } from './hooks/useColorModeSync';
import { useIOSSupport } from './hooks/useIOSSupport';
import { DEFAULT_MODE } from './constants';

function App() {
  const setMode = useCanvasStore(state => state.setMode);
  const { importSvgFiles } = useSvgImport();

  // iOS support hook (handles detection and back swipe prevention)
  const { isIOS } = useIOSSupport();

  // Color mode sync hook (handles theme changes and element color updates)
  useColorModeSync();

  // Sidebar state from store (single source of truth)
  const isSidebarPinned = useCanvasStore(state => state.isSidebarPinned);
  const isSidebarOpen = useCanvasStore(state => state.isSidebarOpen);

  // When sidebar closes and is not pinned, if in sidebar panel mode, switch to default mode
  useEffect(() => {
    if (!isSidebarOpen && !isSidebarPinned && pluginManager.isInSidebarPanelMode()) {
      setMode(DEFAULT_MODE);
    }
  }, [isSidebarOpen, isSidebarPinned, setMode]);

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
        <Sidebar />
        <TopActionBar />
        <BottomActionBar />
        <ExpandableToolPanel />
        <VirtualShiftButton />
        <GlobalOverlays isIOS={isIOS} />
      </div>
  );
}

export default App;
