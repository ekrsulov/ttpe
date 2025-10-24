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
import { SidebarContent } from './sidebar/SidebarContent';
import { RenderCountBadgeWrapper } from './ui/RenderCountBadgeWrapper';
import { usePersistentState } from '../hooks/usePersistentState';

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
  const [sidebarWidth, setSidebarWidth] = usePersistentState('sidebar-width', 250);
  const initialWidth = 250; // Ancho inicial para reset
  
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
  }, [setSidebarWidth]);

  // Handle reset to initial width (double-click)
  const handleReset = useCallback(() => {
    setSidebarWidth(initialWidth);
  }, [initialWidth, setSidebarWidth]);
  
  // Use individual selectors to prevent unnecessary re-renders
  // This way we only re-render when specific values change
  const activePlugin = useCanvasStore((state) => state.activePlugin);
  const setMode = useCanvasStore((state) => state.setMode);
  const pathSimplification = useCanvasStore((state) => state.pathSimplification);
  const pathRounding = useCanvasStore((state) => state.pathRounding);
  const selectedCommands = useCanvasStore((state) => state.selectedCommands);
  const selectedSubpaths = useCanvasStore((state) => state.selectedSubpaths);
  
  // For smoothBrush, select only the properties we need (exclude affectedPoints)
  const smoothBrushRadius = useCanvasStore((state) => state.smoothBrush?.radius ?? 50);
  const smoothBrushStrength = useCanvasStore((state) => state.smoothBrush?.strength ?? 0.5);
  const smoothBrushIsActive = useCanvasStore((state) => state.smoothBrush?.isActive ?? false);
  // Don't subscribe to cursorX/cursorY - they update on every mouse move and aren't needed in Sidebar
  const smoothBrushSimplifyPoints = useCanvasStore((state) => state.smoothBrush?.simplifyPoints ?? true);
  const smoothBrushSimplificationTolerance = useCanvasStore((state) => state.smoothBrush?.simplificationTolerance ?? 1);
  const smoothBrushMinDistance = useCanvasStore((state) => state.smoothBrush?.minDistance ?? 5);
  
  // Add Point Mode state
  const addPointModeIsActive = useCanvasStore((state) => state.addPointMode?.isActive ?? false);
  
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
  const activateAddPointMode = useCanvasStore((state) => state.activateAddPointMode);
  const deactivateAddPointMode = useCanvasStore((state) => state.deactivateAddPointMode);
  
  // Reconstruct smoothBrush object for child components (memoized to prevent re-creation)
  // cursorX/cursorY are omitted - they're only needed in Canvas and cause unnecessary re-renders
  const smoothBrush = useMemo(() => ({
    radius: smoothBrushRadius,
    strength: smoothBrushStrength,
    isActive: smoothBrushIsActive,
    cursorX: 0, // Not used in Sidebar
    cursorY: 0, // Not used in Sidebar
    simplifyPoints: smoothBrushSimplifyPoints,
    simplificationTolerance: smoothBrushSimplificationTolerance,
    minDistance: smoothBrushMinDistance,
    affectedPoints: [], // Empty array - we don't need to track this in Sidebar
  }), [
    smoothBrushRadius,
    smoothBrushStrength,
    smoothBrushIsActive,
    smoothBrushSimplifyPoints,
    smoothBrushSimplificationTolerance,
    smoothBrushMinDistance,
  ]);

  // Reconstruct addPointMode object for child components (memoized to prevent re-creation)
  const addPointMode = useMemo(() => ({
    isActive: addPointModeIsActive,
  }), [addPointModeIsActive]);
  
  // Panel state from store (single source of truth)
  const showFilePanel = useCanvasStore((state) => state.showFilePanel);
  const showSettingsPanel = useCanvasStore((state) => state.showSettingsPanel);
  const setShowFilePanel = useCanvasStore((state) => state.setShowFilePanel);
  const setShowSettingsPanel = useCanvasStore((state) => state.setShowSettingsPanel);
  
  // Local state for arrange panel expansion
  const [isArrangeExpanded, setIsArrangeExpanded] = usePersistentState('arrange-panel-expanded', import.meta.env.DEV);

  // Close special panels when switching to tool modes
  useEffect(() => {
    const toolModes = ['select', 'pan', 'pencil', 'text', 'shape', 'subpath', 'transformation', 'edit'];
    if (toolModes.includes(activePlugin || '')) {
      setShowFilePanel(false);
      setShowSettingsPanel(false);
    }
  }, [activePlugin, setShowFilePanel, setShowSettingsPanel]);

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
          smoothBrush={smoothBrush}
          addPointMode={addPointMode}
          pathSimplification={pathSimplification ?? { tolerance: 1 }}
          pathRounding={pathRounding ?? { radius: 0 }}
          selectedCommands={selectedCommands ?? []}
          selectedSubpaths={selectedSubpaths ?? []}
          updateSmoothBrush={updateSmoothBrush ?? (() => {})}
          updatePathSimplification={updatePathSimplification ?? (() => {})}
          updatePathRounding={updatePathRounding ?? (() => {})}
          applySmoothBrush={applySmoothBrush ?? (() => {})}
          applyPathSimplification={applyPathSimplification ?? (() => {})}
          applyPathRounding={applyPathRounding ?? (() => {})}
          activateSmoothBrush={activateSmoothBrush ?? (() => {})}
          deactivateSmoothBrush={deactivateSmoothBrush ?? (() => {})}
          resetSmoothBrush={resetSmoothBrush ?? (() => {})}
          activateAddPointMode={activateAddPointMode ?? (() => {})}
          deactivateAddPointMode={deactivateAddPointMode ?? (() => {})}
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
          bg="blackAlpha.600"
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
              smoothBrush={smoothBrush}
              addPointMode={addPointMode}
              pathSimplification={pathSimplification ?? { tolerance: 1 }}
              pathRounding={pathRounding ?? { radius: 0 }}
              selectedCommands={selectedCommands ?? []}
              selectedSubpaths={selectedSubpaths ?? []}
              updateSmoothBrush={updateSmoothBrush ?? (() => {})}
              updatePathSimplification={updatePathSimplification ?? (() => {})}
              updatePathRounding={updatePathRounding ?? (() => {})}
              applySmoothBrush={applySmoothBrush ?? (() => {})}
              applyPathSimplification={applyPathSimplification ?? (() => {})}
              applyPathRounding={applyPathRounding ?? (() => {})}
              activateSmoothBrush={activateSmoothBrush ?? (() => {})}
              deactivateSmoothBrush={deactivateSmoothBrush ?? (() => {})}
              resetSmoothBrush={resetSmoothBrush ?? (() => {})}
              activateAddPointMode={activateAddPointMode ?? (() => {})}
              deactivateAddPointMode={deactivateAddPointMode ?? (() => {})}
              isArrangeExpanded={isArrangeExpanded}
              setIsArrangeExpanded={setIsArrangeExpanded}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}