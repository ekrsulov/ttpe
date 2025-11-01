import React, { useMemo, useEffect, useState } from 'react';
import { HStack, useColorModeValue } from '@chakra-ui/react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Trash2,
  Maximize2
} from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';
import { RenderCountBadgeWrapper } from './RenderCountBadgeWrapper';
import { FloatingToolbarShell } from './FloatingToolbarShell';
import { ToolbarIconButton } from './ToolbarIconButton';
import { pluginManager } from '../utils/pluginManager';
import { useDeletionActions } from '../hooks/useDeletionActions';

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
  const deleteColor = useColorModeValue('red.500', 'red.200');
  const disabledDeleteColor = useColorModeValue('gray.700', 'gray.300');
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
  
  // Calculate current zoom percentage
  const currentZoom = useMemo(() => Math.round((viewport.zoom as number) * 100), [viewport.zoom]);
  const isZoomDifferent = currentZoom !== 100;

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);
  const selectedCommandsCount = useMemo(() => selectedCommands?.length ?? 0, [selectedCommands]);
  const selectedSubpathsCount = useMemo(() => getSelectedSubpathsCount?.() ?? 0, [selectedSubpaths]); // eslint-disable-line react-hooks/exhaustive-deps
  const canUndo = useMemo(() => pastStates.length > 0, [pastStates.length]);
  const canRedo = useMemo(() => futureStates.length > 0, [futureStates.length]);

  const zoomFactor = 1.2;

  // Use centralized deletion hook with plugin-aware strategy
  const { scope: deletionScope, canDelete, executeDeletion: handleDelete } = useDeletionActions({
    selectedCommandsCount,
    selectedSubpathsCount,
    selectedElementsCount: selectedCount,
    activePlugin,
    usePluginStrategy: true,
    deleteSelectedCommands,
    deleteSelectedSubpaths,
    deleteSelectedElements,
  });

  const deleteCount = deletionScope.count;

  const pluginBottomActions = pluginManager.getActions('bottom');

  return (
    <FloatingToolbarShell
      toolbarPosition="bottom"
      sidebarWidth={sidebarWidth}
      sx={{
        transition: 'left 0.3s ease-in-out, right 0.3s ease-in-out, transform 0.3s ease-in-out',
      }}
    >
      <HStack spacing={1.5}>
        {pluginBottomActions.length > 0 ? (
          pluginBottomActions.map((action) => {
            const ActionComponent = action.component as React.ComponentType<Record<string, unknown>>;
            return <ActionComponent key={action.id} />;
          })
        ) : (
          <>
            {/* Undo/Redo Group */}
            <HStack spacing={0.5}>
              <ToolbarIconButton
                icon={Undo2}
                label="Undo"
                onClick={() => undo()}
                isDisabled={!canUndo || activePlugin === 'curves'}
                counter={pastStates.length}
              />

              <ToolbarIconButton
                icon={Redo2}
                label="Redo"
                onClick={() => redo()}
                isDisabled={!canRedo || activePlugin === 'curves'}
                counter={futureStates.length}
              />
            </HStack>

            {/* Zoom Group */}
            <HStack spacing={0.5}>
              <ToolbarIconButton
                icon={ZoomOut}
                label="Zoom Out"
                onClick={() => zoom(1 / zoomFactor)}
              />

              <ToolbarIconButton
                icon={Maximize2}
                label="Reset Zoom"
                onClick={() => resetZoom()}
                counter={isZoomDifferent ? currentZoom : undefined}
              />

              <ToolbarIconButton
                icon={ZoomIn}
                label="Zoom In"
                onClick={() => zoom(zoomFactor)}
              />
            </HStack>

            {/* Delete Button */}
            <ToolbarIconButton
              icon={Trash2}
              label="Delete"
              onClick={handleDelete}
              isDisabled={!canDelete}
              counter={deleteCount}
              sx={{
                color: canDelete ? deleteColor : disabledDeleteColor,
              }}
            />
          </>
        )}
      </HStack>
      <RenderCountBadgeWrapper componentName="BottomActionBar" position="bottom-right" />
    </FloatingToolbarShell>
  );
};
