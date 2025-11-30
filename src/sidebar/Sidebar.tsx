import React, { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerOverlay,
  DrawerContent,
  useDisclosure,
  Box,
  useBreakpointValue,
  useColorModeValue
} from '@chakra-ui/react';
import { useCanvasStore } from '../store/canvasStore';
import { SidebarContent } from './components/SidebarContent';
import { RenderCountBadgeWrapper } from '../ui/RenderCountBadgeWrapper';
import { DEFAULT_MODE } from '../constants';
import { pluginManager } from '../utils/pluginManager';

interface SidebarProps {
  onPinnedChange?: (isPinned: boolean) => void;
  onWidthChange?: (width: number) => void; // To inform the width to the ActionBar
  onToggleOpen?: (isOpen: boolean) => void; // To inform if the drawer is open
  onRegisterOpenHandler?: (openHandler: () => void) => void; // To register the open function
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onPinnedChange, 
  onWidthChange, 
  onToggleOpen,
  onRegisterOpenHandler 
}) => {
  // Detect if desktop (md breakpoint = 768px)
  const isDesktop = useBreakpointValue({ base: false, md: true }, { ssr: false });
  const sidebarBg = useColorModeValue('surface.sidebar', 'surface.sidebar');
  const sidebarBorder = useColorModeValue('border.sidebar', 'border.sidebar');
  const overlayBg = useColorModeValue('blackAlpha.600', 'blackAlpha.700');
  
  // Desktop: open by default, Mobile: closed by default
  const { isOpen, onOpen, onClose } = useDisclosure({ 
    defaultIsOpen: isDesktop ?? true 
  });

  // Notify parent when drawer open state changes
  useEffect(() => {
    onToggleOpen?.(isOpen);
  }, [isOpen, onToggleOpen]);

  // Register the open handler with parent
  useEffect(() => {
    onRegisterOpenHandler?.(onOpen);
  }, [onOpen, onRegisterOpenHandler]);
  
  // Sidebar unpinned by default, even on desktop
  const [isPinned, setIsPinned] = useState(false);
  
  // Sidebar width state (only for pinned mode)
  const sidebarWidth = useCanvasStore((state) => state.sidebarWidth);
  const setSidebarWidth = useCanvasStore((state) => state.setSidebarWidth);
  const setIsSidebarPinned = useCanvasStore((state) => state.setIsSidebarPinned);
  const initialWidth = 250; // Initial width for reset
  
  // Sync isPinned with desktop/mobile changes
  useEffect(() => {
    if (!isDesktop) {
      // Mobile: always unpinned
      setIsPinned(false);
    } else if (import.meta.env.DEV) {
      // Dev mode on desktop: always pinned
      setIsPinned(true);
    }
  }, [isDesktop]);

  // Sync pinned state to store for other components (like MinimapPanel)
  useEffect(() => {
    const effectivePinned = isPinned && isDesktop === true;
    setIsSidebarPinned(effectivePinned);
  }, [isPinned, isDesktop, setIsSidebarPinned]);

  // Notify parent when pinned state changes
  useEffect(() => {
    onPinnedChange?.(isPinned && isDesktop === true);
  }, [isPinned, isDesktop, onPinnedChange]);

  // Notify parent of width changes when pinned (debounced to avoid loops)
  useEffect(() => {
    if (isPinned && isDesktop) {
      const timer = setTimeout(() => {
        onWidthChange?.(sidebarWidth);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      onWidthChange?.(0); // No sidebar visible
    }
  }, [sidebarWidth, isPinned, isDesktop, onWidthChange]);

  // Handle sidebar resize
  const handleResize = useCallback((newWidth: number) => {
    setSidebarWidth(newWidth);
  }, [setSidebarWidth]);

  // Handle reset to initial width (double-click)
  const handleReset = useCallback(() => {
    setSidebarWidth(initialWidth);
  }, [initialWidth, setSidebarWidth]);
  
  // Use individual selectors to prevent unnecessary re-renders
  // This way we only re-render when specific values change
  const activePlugin = useCanvasStore((state) => state.activePlugin);
  const setMode = useCanvasStore((state) => state.setMode);
  const selectedCommands = useCanvasStore((state) => state.selectedCommands);
  const selectedSubpaths = useCanvasStore((state) => state.selectedSubpaths);
  
  // Panel state from store (single source of truth)
  const showFilePanel = useCanvasStore((state) => state.showFilePanel);
  const showSettingsPanel = useCanvasStore((state) => state.showSettingsPanel);
  const setShowFilePanel = useCanvasStore((state) => state.setShowFilePanel);
  const setShowSettingsPanel = useCanvasStore((state) => state.setShowSettingsPanel);
  
  // Local state for arrange panel expansion
  const isArrangeExpanded = useCanvasStore((state) => state.arrangePanelExpanded);
  const setIsArrangeExpanded = useCanvasStore((state) => state.setArrangePanelExpanded);

  // Close special panels when switching to tool modes
  useEffect(() => {
    if (activePlugin && !pluginManager.isInSidebarPanelMode()) {
      setShowFilePanel(false);
      setShowSettingsPanel(false);
    }
  }, [activePlugin, setShowFilePanel, setShowSettingsPanel]);

  // Handlers for special panel buttons
  const handleToolClick = (toolName: string) => {
    if (toolName === 'file') {
      if (showFilePanel) {
        // If file panel is open, close it and return to default mode
        setShowFilePanel(false);
        setMode(DEFAULT_MODE);
      } else {
        // Open file panel, close everything else, and set to file mode
        setShowFilePanel(true);
        setShowSettingsPanel(false);
        setMode('file');
      }
    } else if (toolName === 'settings') {
      if (showSettingsPanel) {
        // If settings panel is open, close it and return to default mode
        setShowSettingsPanel(false);
        setMode(DEFAULT_MODE);
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

  // When pinned AND desktop, use a fixed Box instead of Drawer to avoid overlay blocking
  if (isPinned && isOpen && isDesktop) {
    return (
      <Box
        position="fixed"
        right={0}
        top={0}
      bottom={0} // Full height - ActionBar is now floating
      width={`${sidebarWidth}px`} // Dynamic width controlled by resizer
      maxW="100vw"
      h="100dvh" // Full dynamic viewport height
      maxH="100dvh"
      bg={sidebarBg}
      borderLeft="1px solid"
      borderColor={sidebarBorder}
        boxShadow="lg"
        display="flex"
        flexDirection="column"
        zIndex={1000}
        sx={{
          // Prevent text selection in UI
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          // Prevent touch callout on iOS
          WebkitTouchCallout: 'none',
        }}
      >
        <SidebarContent
          variant="pinned"
          activePlugin={activePlugin}
          setMode={setMode}
          onToolClick={handleToolClick}
          showFilePanel={showFilePanel}
          showSettingsPanel={showSettingsPanel}
          isPinned={isPinned}
          onTogglePin={() => setIsPinned(false)}
          isDesktop={isDesktop}
          selectedCommands={selectedCommands ?? []}
          selectedSubpaths={selectedSubpaths ?? []}
          isArrangeExpanded={isArrangeExpanded}
          setIsArrangeExpanded={setIsArrangeExpanded}
          onResize={handleResize}
          onReset={handleReset}
        />
      </Box>
    );
  }

  // Normal drawer mode (not pinned)
  return (
    <>
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
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        closeOnOverlayClick={true}
        closeOnEsc={true}
        size="sm" // 260px for unpinned mode
        // Prevent gesture conflicts on mobile
        blockScrollOnMount={true}
        preserveScrollBarGap={false}
      >
        <DrawerOverlay
          bg={overlayBg}
          sx={{
            // Prevent iOS bounce/overscroll on overlay
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        />
        <DrawerContent
          w="260px"
          h="100dvh" // Full height - ActionBar is now floating
          maxH="100dvh"
          bg={sidebarBg}
          borderLeft="1px solid"
          borderColor={sidebarBorder}
          boxShadow="lg"
          display="flex"
          flexDirection="column"
          sx={{
            // Prevent text selection in UI
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            // Prevent touch callout on iOS
            WebkitTouchCallout: 'none',
            // Prevent pull-to-refresh
            overscrollBehavior: 'contain',
            // Smooth scrolling on iOS
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <DrawerBody p={0} display="flex" flexDirection="column" position="relative">
            <SidebarContent
              variant="drawer"
              activePlugin={activePlugin}
              setMode={setMode}
              onToolClick={handleToolClick}
              showFilePanel={showFilePanel}
              showSettingsPanel={showSettingsPanel}
              isPinned={isPinned}
              onTogglePin={() => setIsPinned(true)}
              isDesktop={isDesktop}
              selectedCommands={selectedCommands ?? []}
              selectedSubpaths={selectedSubpaths ?? []}
              isArrangeExpanded={isArrangeExpanded}
              setIsArrangeExpanded={setIsArrangeExpanded}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}