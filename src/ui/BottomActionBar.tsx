import React, { useMemo, useEffect, useState } from 'react';
import { HStack } from '@chakra-ui/react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';
import { RenderCountBadgeWrapper } from './RenderCountBadgeWrapper';
import { FloatingToolbarShell } from './FloatingToolbarShell';
import { ToolbarIconButton } from './ToolbarIconButton';
import { pluginManager } from '../utils/pluginManager';
import { FloatingContextMenuButton } from './FloatingContextMenuButton';

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

  // Optimize: Only subscribe to zoom value, not the entire viewport object
  const viewportZoom = useCanvasStore(state => state.viewport.zoom);
  const activePlugin = useCanvasStore(state => state.activePlugin);

  const { undo, redo, pastStates, futureStates } = useTemporalState();

  // Subscribe to enabledPlugins to trigger re-render when plugins are toggled
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useCanvasStore(state => (state as any).pluginManager?.enabledPlugins ?? []);

  // Calculate current zoom percentage - memoize based only on zoom value
  const currentZoom = useMemo(() => Math.round((viewportZoom as number) * 100), [viewportZoom]);
  const isZoomDifferent = currentZoom !== 100;

  const canUndo = useMemo(() => pastStates.length > 0, [pastStates.length]);
  const canRedo = useMemo(() => futureStates.length > 0, [futureStates.length]);

  const zoomFactor = 1.2;

  const pluginBottomActions = pluginManager.getActions('bottom');

  return (
    <FloatingToolbarShell
      toolbarPosition="bottom"
      sidebarWidth={sidebarWidth}
      sx={{
        transition: 'left 0.3s ease-in-out, right 0.3s ease-in-out, transform 0.3s ease-in-out',
      }}
    >
      <HStack spacing={0}>
        {pluginBottomActions.length > 0 ? (
          pluginBottomActions.map((action) => {
            const ActionComponent = action.component as React.ComponentType<Record<string, unknown>>;
            return <ActionComponent key={action.id} />;
          })
        ) : (
          <>
            {/* Undo/Redo Group */}
            <HStack spacing={0}>
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
            <HStack spacing={0}>
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

            {/* Context Menu Button (replaces Delete button) */}
            <FloatingContextMenuButton />
          </>
        )}
      </HStack>
      <RenderCountBadgeWrapper componentName="BottomActionBar" position="bottom-right" />
    </FloatingToolbarShell>
  );
};
