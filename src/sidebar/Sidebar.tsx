import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerOverlay,
  DrawerContent,
  Box,
  useBreakpointValue,
  useColorModeValue
} from '@chakra-ui/react';
import { useCanvasStore } from '../store/canvasStore';
import { SidebarContent } from './components/SidebarContent';
import { RenderCountBadgeWrapper } from '../ui/RenderCountBadgeWrapper';
import { DEFAULT_MODE } from '../constants';
import { pluginManager } from '../utils/pluginManager';
import { SidebarContext, type SidebarContextValue } from '../contexts/SidebarContext';

export const Sidebar: React.FC = () => {
  // Detect if desktop (md breakpoint = 768px)
  const isDesktop = useBreakpointValue({ base: false, md: true }, { ssr: false });
  const sidebarBg = useColorModeValue('surface.sidebar', 'surface.sidebar');
  const sidebarBorder = useColorModeValue('border.sidebar', 'border.sidebar');
  const overlayBg = useColorModeValue('blackAlpha.600', 'blackAlpha.700');

  // State from store (single source of truth)
  const sidebarWidth = useCanvasStore((state) => state.sidebarWidth);
  const setSidebarWidth = useCanvasStore((state) => state.setSidebarWidth);
  const isSidebarOpen = useCanvasStore((state) => state.isSidebarOpen);
  const setIsSidebarOpen = useCanvasStore((state) => state.setIsSidebarOpen);
  const setIsSidebarPinned = useCanvasStore((state) => state.setIsSidebarPinned);
  
  const activePlugin = useCanvasStore((state) => state.activePlugin);
  const setMode = useCanvasStore((state) => state.setMode);
  
  // Panel state from store
  const showFilePanel = useCanvasStore((state) => state.showFilePanel);
  const showSettingsPanel = useCanvasStore((state) => state.showSettingsPanel);
  const setShowFilePanel = useCanvasStore((state) => state.setShowFilePanel);
  const setShowSettingsPanel = useCanvasStore((state) => state.setShowSettingsPanel);
  
  // Arrange panel state
  const isArrangeExpanded = useCanvasStore((state) => state.arrangePanelExpanded);
  const setIsArrangeExpanded = useCanvasStore((state) => state.setArrangePanelExpanded);

  const initialWidth = 250;

  // Local pinned state for internal use (syncs with store)
  const [isPinned, setIsPinned] = useState(false);
  
  // Sync isPinned with desktop/mobile changes
  useEffect(() => {
    if (!isDesktop) {
      setIsPinned(false);
    } else if (import.meta.env.DEV) {
      setIsPinned(true);
    }
  }, [isDesktop]);

  // Sync pinned state to store
  useEffect(() => {
    const effectivePinned = isPinned && isDesktop === true;
    setIsSidebarPinned(effectivePinned);
  }, [isPinned, isDesktop, setIsSidebarPinned]);

  // Handle sidebar resize
  const handleResize = useCallback((newWidth: number) => {
    setSidebarWidth(newWidth);
  }, [setSidebarWidth]);

  // Handle reset to initial width
  const handleReset = useCallback(() => {
    setSidebarWidth(initialWidth);
  }, [initialWidth, setSidebarWidth]);

  // Close special panels when switching to tool modes
  useEffect(() => {
    if (activePlugin && !pluginManager.isInSidebarPanelMode()) {
      setShowFilePanel(false);
      setShowSettingsPanel(false);
    }
  }, [activePlugin, setShowFilePanel, setShowSettingsPanel]);

  // Handlers for special panel buttons
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

  const handleTogglePin = useCallback(() => {
    setIsPinned(prev => !prev);
  }, []);

  // Create context value
  const sidebarContextValue: SidebarContextValue = useMemo(() => ({
    activePlugin,
    showFilePanel,
    showSettingsPanel,
    isPinned,
    isDesktop,
    isArrangeExpanded,
    setMode,
    onToolClick: handleToolClick,
    onTogglePin: handleTogglePin,
    setIsArrangeExpanded,
  }), [
    activePlugin,
    showFilePanel,
    showSettingsPanel,
    isPinned,
    isDesktop,
    isArrangeExpanded,
    setMode,
    handleToolClick,
    handleTogglePin,
    setIsArrangeExpanded,
  ]);

  // When pinned AND desktop, use a fixed Box instead of Drawer
  if (isPinned && isSidebarOpen && isDesktop) {
    return (
      <SidebarContext.Provider value={sidebarContextValue}>
        <Box
          position="fixed"
          right={0}
          top={0}
          bottom={0}
          width={`${sidebarWidth}px`}
          maxW="100vw"
          h="100dvh"
          maxH="100dvh"
          bg={sidebarBg}
          borderLeft="1px solid"
          borderColor={sidebarBorder}
          boxShadow="lg"
          display="flex"
          flexDirection="column"
          zIndex={1000}
          sx={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
        >
          <SidebarContent
            variant="pinned"
            onResize={handleResize}
            onReset={handleReset}
          />
        </Box>
      </SidebarContext.Provider>
    );
  }

  // Normal drawer mode (not pinned)
  return (
    <SidebarContext.Provider value={sidebarContextValue}>
      <RenderCountBadgeWrapper 
        componentName="Sidebar" 
        position="top-right"
        wrapperStyle={{ 
          position: 'fixed', 
          top: '60px', 
          right: isPinned && isDesktop ? `${sidebarWidth + 10}px` : '10px',
          zIndex: 10000 
        }}
      />
      <Drawer
        isOpen={isSidebarOpen}
        placement="right"
        onClose={() => setIsSidebarOpen(false)}
        closeOnOverlayClick={true}
        closeOnEsc={true}
        size="sm"
        blockScrollOnMount={true}
        preserveScrollBarGap={false}
      >
        <DrawerOverlay
          bg={overlayBg}
          sx={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        />
        <DrawerContent
          w="260px"
          h="100dvh"
          maxH="100dvh"
          bg={sidebarBg}
          borderLeft="1px solid"
          borderColor={sidebarBorder}
          boxShadow="lg"
          display="flex"
          flexDirection="column"
          sx={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            WebkitTouchCallout: 'none',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <DrawerBody p={0} display="flex" flexDirection="column" position="relative">
            <SidebarContent variant="drawer" />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </SidebarContext.Provider>
  );
}