import React, { useMemo, useEffect, useState } from 'react';
import { Box, HStack, IconButton, Tooltip } from '@chakra-ui/react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Trash2,
  Maximize2
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { RenderCountBadge } from './RenderCountBadge';
import { useRenderCount } from '../../hooks/useRenderCount';

// Custom hook to subscribe to temporal state changes
const useTemporalState = () => {
  const [temporalState, setTemporalState] = useState(() => useCanvasStore.temporal.getState());

  useEffect(() => {
    const unsubscribe = useCanvasStore.temporal.subscribe(setTemporalState);
    return unsubscribe;
  }, []);

  return temporalState;
};

interface BottomActionBarProps {
  sidebarWidth?: number;
}

export const BottomActionBar: React.FC<BottomActionBarProps> = ({
  sidebarWidth = 0,
}) => {
  const zoom = useCanvasStore(state => state.zoom);
  const resetZoom = useCanvasStore(state => state.resetZoom);
  const viewport = useCanvasStore(state => state.viewport);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedCommands = useCanvasStore(state => state.selectedCommands);
  const deleteSelectedElements = useCanvasStore(state => state.deleteSelectedElements);
  const deleteSelectedCommands = useCanvasStore(state => state.deleteSelectedCommands);
  const deleteSelectedSubpaths = useCanvasStore(state => state.deleteSelectedSubpaths);
  const getSelectedSubpathsCount = useCanvasStore(state => state.getSelectedSubpathsCount);
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);

  const { undo, redo, pastStates, futureStates } = useTemporalState();
  
  const { count: renderCount, rps: renderRps } = useRenderCount('BottomActionBar');
  const settings = useCanvasStore(state => state.settings);
  
  // Calculate current zoom percentage
  const currentZoom = useMemo(() => Math.round((viewport.zoom as number) * 100), [viewport.zoom]);
  const isZoomDifferent = currentZoom !== 100;

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);
  const selectedCommandsCount = useMemo(() => selectedCommands.length, [selectedCommands]);
  const selectedSubpathsCount = useMemo(() => getSelectedSubpathsCount(), [selectedSubpaths]); // eslint-disable-line react-hooks/exhaustive-deps
  const canUndo = useMemo(() => pastStates.length > 0, [pastStates.length]);
  const canRedo = useMemo(() => futureStates.length > 0, [futureStates.length]);

  const zoomFactor = 1.2;

  // Handle delete action based on active plugin
  const handleDelete = () => {
    if (activePlugin === 'edit' && selectedCommandsCount > 0) {
      deleteSelectedCommands();
    } else if (activePlugin === 'subpath' && selectedSubpathsCount > 0) {
      deleteSelectedSubpaths();
    } else if (activePlugin === 'select' && selectedCount > 0) {
      deleteSelectedElements();
    }
  };

  // Determine if delete button should be enabled and count
  const deleteCount = useMemo(() => {
    if (activePlugin === 'edit') return selectedCommandsCount;
    if (activePlugin === 'subpath') return selectedSubpathsCount;
    if (activePlugin === 'select') return selectedCount;
    return 0;
  }, [activePlugin, selectedCommandsCount, selectedSubpathsCount, selectedCount]);

  const canDelete = deleteCount > 0;

  const isSidebarPinned = sidebarWidth > 0;

  return (
    <Box
      position="fixed"
      bottom={{ base: 2, md: 3 }}
      left={isSidebarPinned ? "0" : "50%"}
      right={isSidebarPinned ? `${sidebarWidth}px` : "auto"}
      transform={isSidebarPinned ? "none" : "translateX(-50%)"}
      marginLeft={isSidebarPinned ? "auto" : 0}
      marginRight={isSidebarPinned ? "auto" : 0}
      width="fit-content"
      zIndex={1000}
      bg="white"
      px={2}
      py={1}
      borderRadius="xl"
      boxShadow="lg"
      backdropFilter="blur(10px)"
      backgroundColor="rgba(255, 255, 255, 0.95)"
    >
      <HStack spacing={1.5}>
        {/* Undo/Redo Group */}
        <HStack spacing={0.5}>
          <Tooltip label="Undo" placement="top">
            <Box position="relative">
              <IconButton
                aria-label="Undo"
                icon={<Undo2 size={14} />}
                onClick={() => undo()}
                isDisabled={!canUndo}
                colorScheme={canUndo ? 'blue' : 'gray'}
                variant={canUndo ? 'solid' : 'ghost'}
                size="xs"
                sx={{
                  minHeight: '28px',
                  minWidth: '28px',
                }}
              />
              {pastStates.length > 0 && (
                <Box
                  position="absolute"
                  top="-8px"
                  right="-4px"
                  bg="rgba(59, 130, 246, 0.7)"
                  color="white"
                  borderRadius="full"
                  minW="16px"
                  h="16px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="9px"
                  fontWeight="bold"
                  px="3px"
                >
                  {pastStates.length}
                </Box>
              )}
            </Box>
          </Tooltip>

          <Tooltip label="Redo" placement="top">
            <Box position="relative">
              <IconButton
                aria-label="Redo"
                icon={<Redo2 size={14} />}
                onClick={() => redo()}
                isDisabled={!canRedo}
                colorScheme={canRedo ? 'blue' : 'gray'}
                variant={canRedo ? 'solid' : 'ghost'}
                size="xs"
                sx={{
                  minHeight: '28px',
                  minWidth: '28px',
                }}
              />
              {futureStates.length > 0 && (
                <Box
                  position="absolute"
                  top="-8px"
                  right="-4px"
                  bg="rgba(59, 130, 246, 0.7)"
                  color="white"
                  borderRadius="full"
                  minW="16px"
                  h="16px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="9px"
                  fontWeight="bold"
                  px="3px"
                >
                  {futureStates.length}
                </Box>
              )}
            </Box>
          </Tooltip>
        </HStack>

        {/* Zoom Group */}
        <HStack spacing={0.5}>
          <Tooltip label="Zoom Out" placement="top">
            <IconButton
              aria-label="Zoom Out"
              icon={<ZoomOut size={14} />}
              onClick={() => zoom(1 / zoomFactor)}
              colorScheme="gray"
              variant="ghost"
              size="xs"
              sx={{
                minHeight: '28px',
                minWidth: '28px',
              }}
            />
          </Tooltip>

          <Tooltip label="Reset Zoom" placement="top">
            <Box position="relative">
              <IconButton
                aria-label="Reset Zoom"
                icon={<Maximize2 size={14} />}
                onClick={() => resetZoom()}
                colorScheme="gray"
                variant="ghost"
                size="xs"
                sx={{
                  minHeight: '28px',
                  minWidth: '28px',
                }}
              />
              {isZoomDifferent && (
                <Box
                  position="absolute"
                  top="-10px"
                  left="50%"
                  transform="translateX(-50%)"
                  bg="rgba(75, 85, 99, 0.7)"
                  color="white"
                  borderRadius="full"
                  minW="28px"
                  h="16px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="9px"
                  fontWeight="bold"
                  px="4px"
                >
                  {currentZoom}%
                </Box>
              )}
            </Box>
          </Tooltip>

          <Tooltip label="Zoom In" placement="top">
            <IconButton
              aria-label="Zoom In"
              icon={<ZoomIn size={14} />}
              onClick={() => zoom(zoomFactor)}
              colorScheme="gray"
              variant="ghost"
              size="xs"
              sx={{
                minHeight: '28px',
                minWidth: '28px',
              }}
            />
          </Tooltip>
        </HStack>

        {/* Delete Button */}
        <Tooltip label="Delete" placement="top">
          <Box position="relative">
            <IconButton
              aria-label="Delete"
              icon={<Trash2 size={14} />}
              onClick={handleDelete}
              isDisabled={!canDelete}
              colorScheme={canDelete ? 'red' : 'gray'}
              variant={canDelete ? 'solid' : 'ghost'}
              size="xs"
              sx={{
                minHeight: '28px',
                minWidth: '28px',
              }}
            />
            {deleteCount > 0 && (
              <Box
                position="absolute"
                top="-8px"
                right="-4px"
                bg="rgba(239, 68, 68, 0.7)"
                color="white"
                borderRadius="full"
                minW="16px"
                h="16px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="9px"
                fontWeight="bold"
                px="3px"
              >
                {deleteCount}
              </Box>
            )}
          </Box>
        </Tooltip>
      </HStack>
      {process.env.NODE_ENV === 'development' && settings.showRenderCountBadges && (
        <RenderCountBadge count={renderCount} rps={renderRps} position="bottom-right" />
      )}
    </Box>
  );
};
