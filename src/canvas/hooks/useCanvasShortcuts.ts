import { useEffect, useMemo } from 'react';
import type { RefObject } from 'react';
import { useCanvasEventBus } from '../CanvasEventBusContext';
import { useCanvasController } from '../controller/CanvasControllerContext';
import type { ShortcutRegistry } from '../shortcuts';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { getGlobalCurvesController } from '../../plugins/curves';

const CORE_SHORTCUT_SOURCE = 'canvas:core';

const handleEscapeShortcut = (state: CanvasStore) => {
  if (state.showFilePanel) {
    state.setShowFilePanel(false);
    state.setActivePlugin('select');
    return;
  }

  if (state.showSettingsPanel) {
    state.setShowSettingsPanel(false);
    state.setActivePlugin('select');
    return;
  }

  if (state.activePlugin === 'curves' && state.curveState?.points && state.curveState.points.length > 0) {
    const controller = getGlobalCurvesController();
    if (controller) {
      controller.cancel();
    }
    return;
  }

  if (state.activePlugin === 'select' && state.selectedIds.length > 0) {
    state.clearSelection();
    return;
  }

  if (state.activePlugin === 'subpath' && (state.selectedSubpaths?.length ?? 0) > 0) {
    state.clearSubpathSelection?.();
    return;
  }

  if (state.activePlugin === 'edit' && (state.selectedCommands?.length ?? 0) > 0) {
    state.clearSelectedCommands?.();
    return;
  }

  if (
    (state.activePlugin === 'transformation' || state.activePlugin === 'edit') &&
    (state.selectedSubpaths?.length ?? 0) > 0
  ) {
    state.setActivePlugin('subpath');
    return;
  }

  state.setActivePlugin('select');
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
