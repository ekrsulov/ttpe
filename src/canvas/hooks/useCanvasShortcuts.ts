import { useEffect, useMemo } from 'react';
import type { RefObject } from 'react';
import { useCanvasEventBus } from '../CanvasEventBusContext';
import { useCanvasController } from '../controller/CanvasControllerContext';
import type { ShortcutRegistry } from '../shortcuts';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { getDeletionScope, executeDeletion } from '../../utils/deletionScopeUtils';
import { isTextFieldFocused } from '../../utils/domHelpers';
import type { CanvasShortcutContext } from '../../types/plugins';
import { DEFAULT_MODE } from '../../constants';

const CORE_SHORTCUT_SOURCE = 'canvas:core';

const handleEscapeShortcut = (state: CanvasStore) => {
  if (state.showFilePanel) {
    state.setShowFilePanel(false);
    state.setActivePlugin(DEFAULT_MODE);
    return;
  }

  if (state.showSettingsPanel) {
    state.setShowSettingsPanel(false);
    state.setActivePlugin(DEFAULT_MODE);
    return;
  }

  // Plugin-specific escape handling moved to plugins

  if (state.activePlugin === DEFAULT_MODE && state.selectedIds.length > 0) {
    state.clearSelection();
    return;
  }

  state.setActivePlugin(DEFAULT_MODE);
};

const handleArrowKey = (event: KeyboardEvent, context: CanvasShortcutContext, dirX: number, dirY: number) => {
  const state = context.store.getState() as CanvasStore;

  // Don't move if typing
  if (isTextFieldFocused()) return;

  const { viewport, settings, selectedCommands, selectedSubpaths, selectedIds } = state;

  // Calculate zoom-adjusted movement delta
  const baseDelta = event.shiftKey ? 10 : 1;
  const zoomAdjustedDelta = viewport.zoom > 1 ? baseDelta / viewport.zoom : baseDelta;

  const deltaX = dirX * zoomAdjustedDelta;
  const deltaY = dirY * zoomAdjustedDelta;

  // Apply precision rounding
  const precision = settings.keyboardMovementPrecision;
  const roundedDeltaX = precision === 0 ? Math.round(deltaX) : parseFloat(deltaX.toFixed(precision));
  const roundedDeltaY = precision === 0 ? Math.round(deltaY) : parseFloat(deltaY.toFixed(precision));

  // Priority: points > subpaths > paths
  if ((selectedCommands?.length ?? 0) > 0 && state.moveSelectedPoints) {
    state.moveSelectedPoints(roundedDeltaX, roundedDeltaY);
  } else if ((selectedSubpaths?.length ?? 0) > 0 && state.moveSelectedSubpaths) {
    state.moveSelectedSubpaths(roundedDeltaX, roundedDeltaY);
  } else if (selectedIds.length > 0) {
    state.moveSelectedElements(roundedDeltaX, roundedDeltaY);
  }
};

export const useCanvasShortcuts = (
  registry: ShortcutRegistry,
  svgRef?: RefObject<SVGSVGElement | null>
) => {
  const eventBus = useCanvasEventBus();
  const controller = useCanvasController();

  const storeApi = useMemo(
    () => ({
      getState: useCanvasStore.getState,
      subscribe: useCanvasStore.subscribe,
    }),
    []
  );

  useEffect(() => {
    registry.mount(window);

    const unregisterCoreShortcuts = registry.register(CORE_SHORTCUT_SOURCE, {
      Escape: {
        handler: (_event, context) => {
          const state = context.store.getState() as CanvasStore;
          handleEscapeShortcut(state);
        },
      },
      Delete: {
        handler: (_event, context) => {
          const state = context.store.getState() as CanvasStore;
          // Use priority-based deletion (commands > subpaths > elements)
          const scope = getDeletionScope({
            selectedCommandsCount: state.selectedCommands?.length ?? 0,
            selectedSubpathsCount: state.selectedSubpaths?.length ?? 0,
            selectedElementsCount: state.selectedIds.length,
            activePlugin: state.activePlugin,
          }, false); // false = priority strategy

          executeDeletion(scope, {
            deleteSelectedCommands: state.deleteSelectedCommands,
            deleteSelectedSubpaths: state.deleteSelectedSubpaths,
            deleteSelectedElements: state.deleteSelectedElements,
          });
        },
        options: { preventDefault: true }
      },
      Backspace: {
        handler: (_event, context) => {
          const state = context.store.getState() as CanvasStore;
          // Use priority-based deletion (commands > subpaths > elements)
          const scope = getDeletionScope({
            selectedCommandsCount: state.selectedCommands?.length ?? 0,
            selectedSubpathsCount: state.selectedSubpaths?.length ?? 0,
            selectedElementsCount: state.selectedIds.length,
            activePlugin: state.activePlugin,
          }, false); // false = priority strategy

          executeDeletion(scope, {
            deleteSelectedCommands: state.deleteSelectedCommands,
            deleteSelectedSubpaths: state.deleteSelectedSubpaths,
            deleteSelectedElements: state.deleteSelectedElements,
          });
        },
        options: { preventDefault: true }
      },
      ArrowUp: {
        handler: (event, context) => handleArrowKey(event, context, 0, -1),
        options: { preventDefault: true }
      },
      ArrowDown: {
        handler: (event, context) => handleArrowKey(event, context, 0, 1),
        options: { preventDefault: true }
      },
      ArrowLeft: {
        handler: (event, context) => handleArrowKey(event, context, -1, 0),
        options: { preventDefault: true }
      },
      ArrowRight: {
        handler: (event, context) => handleArrowKey(event, context, 1, 0),
        options: { preventDefault: true }
      },
    });

    return () => {
      unregisterCoreShortcuts();
      registry.unmount();
      registry.setContext(null);
    };
  }, [registry, storeApi]);

  useEffect(() => {
    registry.setContext({
      eventBus,
      controller,
      store: storeApi,
      svg: svgRef?.current ?? null,
    });
  }, [registry, eventBus, controller, storeApi, svgRef]);
};
