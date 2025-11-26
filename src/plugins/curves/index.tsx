import type { PluginDefinition, PluginSliceFactory, PluginHandlerContext } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createCurvesPluginSlice } from './slice';
import { SplinePointer } from 'lucide-react';
import { CurvesRenderer } from './CurvesRenderer';
import React from 'react';
import { CurvesPanel } from './CurvesPanel';
import { getGlobalCurvesController } from './globalController';

const curvesSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createCurvesPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

// Global listener flags and cleanup handles
let listenersInstalled = false;
let stopStoreSubscription: (() => void) | null = null;

const installListeners = (context: PluginHandlerContext<CanvasStore>) => {
  if (listenersInstalled) return;
  listenersInstalled = true;

  const handlePointerMove = (moveEvent: PointerEvent) => {
    const controller = getGlobalCurvesController();
    if (!controller) return;

    const svg = document.querySelector('svg');
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const currentState = context.store.getState() as CanvasStore;

    const canvasPoint = {
      x: (moveEvent.clientX - rect.left - currentState.viewport.panX) / currentState.viewport.zoom,
      y: (moveEvent.clientY - rect.top - currentState.viewport.panY) / currentState.viewport.zoom,
    };

    controller.handlePointerMove(canvasPoint);
  };

  const handlePointerUp = (_upEvent: PointerEvent) => {
    const controller = getGlobalCurvesController();
    if (!controller) return;
    controller.handlePointerUp();
  };

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);

  // Subscribe to store to remove listeners when the active plugin changes away from curves
  stopStoreSubscription = context.store.subscribe((state) => {
    if (state.activePlugin !== 'curves') {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (stopStoreSubscription) stopStoreSubscription();
      listenersInstalled = false;
      stopStoreSubscription = null;
    }
  });
};

export const curvesPlugin: PluginDefinition<CanvasStore> = {
  id: 'curves',
  metadata: {
    label: 'Curves',
    icon: SplinePointer,
    cursor: 'crosshair',
    disablePathInteraction: true,
  },
  modeConfig: {
    description: 'Draws parametric curves.',
    transitions: {
      select: { description: 'Returns to selection mode.' },
      '*': { description: 'Allows transitioning to other modes.' },
    },
  },
  toolDefinition: { order: 7 },
  handler: (
    event,
    point,
    _target,
    context
  ) => {
    const controller = getGlobalCurvesController();
    if (controller) {
      controller.handlePointerDown(point, event.shiftKey);
      installListeners(context);
    }
  },
  canvasLayers: [
    {
      id: 'curves-renderer',
      placement: 'midground',
      render: ({ activePlugin }) => (activePlugin === 'curves' ? <CurvesRenderer /> : null),
    },
  ],
  slices: [curvesSliceFactory],
  keyboardShortcuts: {
    'Delete': {
      handler: () => {
        const controller = getGlobalCurvesController();
        if (controller) {
          controller.deleteSelectedPoint();
        }
      },
      options: {
        preventDefault: true,
      },
    },
    'Backspace': {
      handler: () => {
        const controller = getGlobalCurvesController();
        if (controller) {
          controller.deleteSelectedPoint();
        }
      },
      options: {
        preventDefault: true,
      },
    },
    'Enter': {
      handler: () => {
        const controller = getGlobalCurvesController();
        if (controller) {
          const state = controller.getState();
          if (state.points && state.points.length >= 2) {
            controller.finishPath();
          }
        }
      },
      options: {
        preventDefault: true,
      },
    },
    'Escape': {
      handler: () => {
        const controller = getGlobalCurvesController();
        if (controller) {
          const state = controller.getState();
          if (state.points && state.points.length > 0) {
            controller.cancel();
          }
        }
      },
      options: {
        preventDefault: true,
      },
    },
  },
  expandablePanel: () => React.createElement(CurvesPanel, { hideTitle: true }),
  sidebarPanels: [
    {
      key: 'curves',
      condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'curves',
      component: CurvesPanel,
    },
  ],
};

// Re-export from other files for external use
export type { CurvesPluginSlice } from './slice';
export { CurvesPanel } from './CurvesPanel';
export { CurvesRenderer } from './CurvesRenderer';
export { useCanvasCurves } from './useCanvasCurves';
export { CurvesControllerProvider } from './CurvesControllerContext';
// eslint-disable-next-line react-refresh/only-export-components
export { getGlobalCurvesController, setGlobalCurvesController } from './globalController';
