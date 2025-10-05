import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerOverlay,
  DrawerContent,
  useDisclosure,
  Box,
  useBreakpointValue
} from '@chakra-ui/react';
import { useCanvasStore } from '../store/canvasStore';
import { SidebarToolGrid } from './sidebar/SidebarToolGrid';
import { SidebarPanels } from './sidebar/SidebarPanels';
import { SidebarFooter } from './sidebar/SidebarFooter';
import { SidebarResizer } from './sidebar/SidebarResizer';
import { RenderCountBadge } from './ui/RenderCountBadge';
import { useRenderCount } from '../hooks/useRenderCount';

interface SidebarProps {
  onPinnedChange?: (isPinned: boolean) => void;
  onWidthChange?: (width: number) => void; // Para informar el ancho al ActionBar
  onToggleOpen?: (isOpen: boolean) => void; // Para informar si el drawer está abierto
  onRegisterOpenHandler?: (openHandler: () => void) => void; // Para registrar la función de abrir
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onPinnedChange, 
  onWidthChange, 
  onToggleOpen,
  onRegisterOpenHandler 
}) => {
  const { count: renderCount, rps: renderRps } = useRenderCount('Sidebar');
  
  // Detect if desktop (md breakpoint = 768px)
  const isDesktop = useBreakpointValue({ base: false, md: true }, { ssr: false });
  
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
  
  // Desktop: pinned by default, Mobile: never pinned
  const [isPinned, setIsPinned] = useState(isDesktop ?? true);
  
  // Sidebar width state (only for pinned mode)
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const initialWidth = 300; // Ancho inicial para reset
  
  // Sync isPinned with desktop/mobile changes
  useEffect(() => {
    if (!isDesktop) {
      // Mobile: always unpinned
      setIsPinned(false);
    }
  }, [isDesktop]);

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
  }, []);

  // Handle reset to initial width (double-click)
  const handleReset = useCallback(() => {
    setSidebarWidth(initialWidth);
  }, [initialWidth]);
  
  // Use individual selectors to prevent unnecessary re-renders
  // This way we only re-render when specific values change
  const activePlugin = useCanvasStore((state) => state.activePlugin);
  const setMode = useCanvasStore((state) => state.setMode);
  const settings = useCanvasStore((state) => state.settings);
  const pathSimplification = useCanvasStore((state) => state.pathSimplification);
  const pathRounding = useCanvasStore((state) => state.pathRounding);
  const selectedCommands = useCanvasStore((state) => state.selectedCommands);
  
  // For smoothBrush, select only the properties we need (exclude affectedPoints)
  const smoothBrushRadius = useCanvasStore((state) => state.smoothBrush.radius);
  const smoothBrushStrength = useCanvasStore((state) => state.smoothBrush.strength);
  const smoothBrushIsActive = useCanvasStore((state) => state.smoothBrush.isActive);
  const smoothBrushCursorX = useCanvasStore((state) => state.smoothBrush.cursorX);
  const smoothBrushCursorY = useCanvasStore((state) => state.smoothBrush.cursorY);
  const smoothBrushSimplifyPoints = useCanvasStore((state) => state.smoothBrush.simplifyPoints);
  const smoothBrushSimplificationTolerance = useCanvasStore((state) => state.smoothBrush.simplificationTolerance);
  const smoothBrushMinDistance = useCanvasStore((state) => state.smoothBrush.minDistance);
  
  // Actions (these are stable references)
  const updateSmoothBrush = useCanvasStore((state) => state.updateSmoothBrush);
  const updatePathSimplification = useCanvasStore((state) => state.updatePathSimplification);
  const updatePathRounding = useCanvasStore((state) => state.updatePathRounding);
  const applySmoothBrush = useCanvasStore((state) => state.applySmoothBrush);
  const applyPathSimplification = useCanvasStore((state) => state.applyPathSimplification);
  const applyPathRounding = useCanvasStore((state) => state.applyPathRounding);
  const activateSmoothBrush = useCanvasStore((state) => state.activateSmoothBrush);
  const deactivateSmoothBrush = useCanvasStore((state) => state.deactivateSmoothBrush);
  const resetSmoothBrush = useCanvasStore((state) => state.resetSmoothBrush);
  
  // Reconstruct smoothBrush object for child components (memoized to prevent re-creation)
  const smoothBrush = useMemo(() => ({
    radius: smoothBrushRadius,
    strength: smoothBrushStrength,
    isActive: smoothBrushIsActive,
    cursorX: smoothBrushCursorX,
    cursorY: smoothBrushCursorY,
    simplifyPoints: smoothBrushSimplifyPoints,
    simplificationTolerance: smoothBrushSimplificationTolerance,
    minDistance: smoothBrushMinDistance,
    affectedPoints: [], // Empty array - we don't need to track this in Sidebar
  }), [
    smoothBrushRadius,
    smoothBrushStrength,
    smoothBrushIsActive,
    smoothBrushCursorX,
    smoothBrushCursorY,
    smoothBrushSimplifyPoints,
    smoothBrushSimplificationTolerance,
    smoothBrushMinDistance,
  ]);
  
  // Local state for panels
  const [showFilePanel, setShowFilePanel] = useState<boolean>(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
  const [isArrangeExpanded, setIsArrangeExpanded] = useState(true);

  // Close special panels when switching to tool modes
  useEffect(() => {
    const toolModes = ['select', 'pan', 'pencil', 'text', 'shape', 'subpath', 'transformation', 'edit'];
    if (toolModes.includes(activePlugin || '')) {
      setShowFilePanel(false);
      setShowSettingsPanel(false);
    }
  }, [activePlugin]);

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
        bg="white"
        borderLeft="1px solid"
        borderColor="gray.200"
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
        {/* Resizer handle */}
        <SidebarResizer
          onResize={handleResize}
          onReset={handleReset}
          minWidth={260}
          maxWidth={600}
        />
        
        {/* Body container with relative positioning for absolute footer */}
        <Box p={0} display="flex" flexDirection="column" flex="1" overflow="hidden" position="relative">
          {/* Tools Grid - Fixed at top */}
          <SidebarToolGrid 
            activePlugin={activePlugin}
            setMode={setMode}
            onToolClick={handleToolClick}
            showFilePanel={showFilePanel}
            showSettingsPanel={showSettingsPanel}
            isPinned={isPinned}
            onTogglePin={() => setIsPinned(false)}
            isDesktop={isDesktop}
          />

          {/* Main Panels - Scrollable middle section */}
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

          {/* Footer with ArrangePanel and SelectPanel - Fixed at bottom */}
          {/* Hide in special panel mode (file/settings) */}
          {!showFilePanel && !showSettingsPanel && (
            <SidebarFooter
              isArrangeExpanded={isArrangeExpanded}
              setIsArrangeExpanded={setIsArrangeExpanded}
            />
          )}
        </Box>
      </Box>
    );
  }

  // Normal drawer mode (not pinned)
  return (
    <>
      {process.env.NODE_ENV === 'development' && settings.showRenderCountBadges && (
        <div style={{ 
          position: 'fixed', 
          top: '60px', 
          right: isPinned && isDesktop ? `${sidebarWidth + 10}px` : '10px',
          zIndex: 10000 
        }}>
          <RenderCountBadge count={renderCount} rps={renderRps} position="top-right" />
        </div>
      )}
      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        closeOnOverlayClick={true}
        closeOnEsc={true}
        size="sm" // 300px for unpinned mode
        // Prevent gesture conflicts on mobile
        blockScrollOnMount={true}
        preserveScrollBarGap={false}
      >
        <DrawerOverlay 
          bg="blackAlpha.600"
          sx={{
            // Prevent iOS bounce/overscroll on overlay
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        />
        <DrawerContent
          h="100dvh" // Full height - ActionBar is now floating
          maxH="100dvh"
          bg="white"
          borderLeft="1px solid"
          borderColor="gray.200"
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
            {/* Tools Grid - Fixed at top */}
            <SidebarToolGrid 
              activePlugin={activePlugin}
              setMode={setMode}
              onToolClick={handleToolClick}
              showFilePanel={showFilePanel}
              showSettingsPanel={showSettingsPanel}
              isPinned={isPinned}
              onTogglePin={() => setIsPinned(true)}
              isDesktop={isDesktop}
            />

            {/* Main Panels - Scrollable middle section */}
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

            {/* Footer with ArrangePanel and SelectPanel - Fixed at bottom */}
            {/* Hide in special panel mode (file/settings) */}
            {!showFilePanel && !showSettingsPanel && (
              <SidebarFooter
                isArrangeExpanded={isArrangeExpanded}
                setIsArrangeExpanded={setIsArrangeExpanded}
              />
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}