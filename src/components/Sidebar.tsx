import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerOverlay,
  DrawerContent,
  useDisclosure,
  IconButton,
  HStack,
  Box,
  useBreakpointValue
} from '@chakra-ui/react';
import { Menu, X, Pin, PinOff } from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';
import { SidebarToolGrid } from './sidebar/SidebarToolGrid';
import { SidebarPanels } from './sidebar/SidebarPanels';
import { SidebarFooter } from './sidebar/SidebarFooter';

export const Sidebar: React.FC = () => {
  // Detect if desktop (md breakpoint = 768px)
  const isDesktop = useBreakpointValue({ base: false, md: true }, { ssr: false });
  
  // Desktop: open by default, Mobile: closed by default
  const { isOpen, onOpen, onClose } = useDisclosure({ 
    defaultIsOpen: isDesktop ?? true 
  });
  
  // Desktop: pinned by default, Mobile: never pinned
  const [isPinned, setIsPinned] = useState(isDesktop ?? true);
  
  // Sync isPinned with desktop/mobile changes
  useEffect(() => {
    if (!isDesktop) {
      // Mobile: always unpinned
      setIsPinned(false);
    }
  }, [isDesktop]);
  
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

  // When pinned AND desktop, use a fixed Box instead of Drawer to avoid overlay blocking
  if (isPinned && isOpen && isDesktop) {
    return (
      <Box
        position="fixed"
        right={0}
        top={0}
        bottom={0}
        width="sm"
        h="100vh"
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
        {/* Header with Pin and Close buttons */}
        <Box 
          p={2} 
          borderBottom="1px solid" 
          borderColor="gray.200"
          bg="gray.50"
        >
          <HStack spacing={1} justify="flex-end">
            <IconButton
              aria-label="Pin sidebar"
              icon={<Pin size={16} />}
              onClick={() => setIsPinned(false)}
              size="sm"
              variant="ghost"
              colorScheme="blue"
              title="Unpin sidebar"
            />
            <IconButton
              aria-label="Close sidebar"
              icon={<X size={16} />}
              onClick={onClose}
              size="sm"
              variant="ghost"
              colorScheme="gray"
              title="Close sidebar"
            />
          </HStack>
        </Box>

        <Box p={0} display="flex" flexDirection="column" flex="1" overflow="auto">
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
        </Box>
      </Box>
    );
  }

  // Normal drawer mode (not pinned)
  return (
    <>
      {/* Hamburger menu button - only show when drawer is closed */}
      {!isOpen && (
        <IconButton
          aria-label="Open sidebar"
          icon={<Menu size={20} />}
          onClick={onOpen}
          position="fixed"
          top={4}
          right={4}
          zIndex={999}
          colorScheme="blue"
          size="md"
        />
      )}

      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        closeOnOverlayClick={true}
        closeOnEsc={true}
        size="sm"
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
          h="100vh"
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
          {/* Header with Pin and Close buttons */}
          <Box 
            p={2} 
            borderBottom="1px solid" 
            borderColor="gray.200"
            bg="gray.50"
          >
            <HStack spacing={1} justify="flex-end">
              {/* Pin button - only show on desktop */}
              {isDesktop && (
                <IconButton
                  aria-label="Pin sidebar"
                  icon={<PinOff size={16} />}
                  onClick={() => setIsPinned(true)}
                  size="sm"
                  variant="ghost"
                  colorScheme="gray"
                  title="Pin sidebar (prevents auto-close)"
                />
              )}
              <IconButton
                aria-label="Close sidebar"
                icon={<X size={16} />}
                onClick={onClose}
                size="sm"
                variant="ghost"
                colorScheme="gray"
                title="Close sidebar"
              />
            </HStack>
          </Box>

          <DrawerBody p={0} display="flex" flexDirection="column">
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
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};