import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createCurvesPluginSlice } from './slice';
import { getToolMetadata } from '../toolMetadata';
import { CurvesRenderer } from './CurvesRenderer';
import React from 'react';
import { CurvesPanel } from './CurvesPanel';
import { getGlobalCurvesController } from './globalController';
import { getEffectiveShift } from '../../utils/effectiveShift';

const curvesSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createCurvesPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const curvesPlugin: PluginDefinition<CanvasStore> = {
  id: 'curves',
  metadata: getToolMetadata('curves'),
  handler: (
    _event,
    _point,
    _target,
    _context
  ) => {
    // Curves tool relies on dedicated canvas interactions
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
  },
  expandablePanel: () => React.createElement(CurvesPanel, { hideTitle: true }),
  init: (context) => {
    const { store } = context;
    const eventBus = (store.getState() as any).eventBus; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (!eventBus) {
      console.warn('EventBus not available for curves plugin');
      return;
    }

    const unsubscribeDown = eventBus.subscribe('pointerdown', (payload: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (payload.activePlugin !== 'curves') return;

      const controller = getGlobalCurvesController();
      if (controller) {
        const effectiveShift = getEffectiveShift(payload.event.shiftKey, (store.getState() as any).isVirtualShiftActive); // eslint-disable-line @typescript-eslint/no-explicit-any
        controller.handlePointerDown(payload.point, effectiveShift);
      }
    });

    const unsubscribeMove = eventBus.subscribe('pointermove', (payload: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (payload.activePlugin !== 'curves') return;

      const controller = getGlobalCurvesController();
      if (controller) {
        controller.handlePointerMove(payload.point);
      }
    });

    const unsubscribeUp = eventBus.subscribe('pointerup', (payload: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (payload.activePlugin !== 'curves') return;

      const controller = getGlobalCurvesController();
      if (controller) {
        controller.handlePointerUp();
      }
    });

    return () => {
      unsubscribeDown();
      unsubscribeMove();
      unsubscribeUp();
    };
  },
};

// Re-export from other files for external use
export type { CurvesPluginSlice } from './slice';
export { CurvesPanel } from './CurvesPanel';
export { CurvesRenderer } from './CurvesRenderer';
export { useCanvasCurves } from './useCanvasCurves';
export { CurvesControllerProvider } from './CurvesControllerContext';
// eslint-disable-next-line react-refresh/only-export-components
export { getGlobalCurvesController, setGlobalCurvesController } from './globalController';
