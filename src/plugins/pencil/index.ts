import type { PluginDefinition, PluginSliceFactory, PluginHandlerContext } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createPencilPluginSlice } from './slice';
import type { PencilPluginSlice } from './slice';
import React from 'react';
import { PencilPanel } from './PencilPanel';
import { startPath, addPointToPath, finalizePath } from './actions';
import type { Point } from '../../types';

type PencilPluginApi = {
  startPath: (point: Point) => void;
  addPointToPath: (point: Point) => void;
  finalizePath: (points: Point[]) => void;
};

const pencilSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // Call the slice creator and cast appropriately
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createPencilPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

// Global listener flags and cleanup handles
let listenersInstalled = false;
let stopStoreSubscription: (() => void) | null = null;

const installListeners = (context: PluginHandlerContext<CanvasStore>, api: PencilPluginApi) => {
  if (listenersInstalled) return;
  listenersInstalled = true;

  const handlePointerMove = (moveEvent: PointerEvent) => {
    // Only draw if primary button is pressed
    if (moveEvent.buttons !== 1) return;

    const svg = document.querySelector('svg');
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const currentState = context.store.getState() as CanvasStore;

    const canvasPoint = {
      x: (moveEvent.clientX - rect.left - currentState.viewport.panX) / currentState.viewport.zoom,
      y: (moveEvent.clientY - rect.top - currentState.viewport.panY) / currentState.viewport.zoom,
    };

    api.addPointToPath(canvasPoint);
  };

  const handlePointerUp = (_upEvent: PointerEvent) => {
    // Pencil path finalization is typically handled by the service or when the user switches tools
    // But we can ensure we stop listening if the user stops drawing
    // For pencil, we might want to keep listening if they click again, but here we are just handling the drag
  };

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);

  // Subscribe to store to remove listeners when the active plugin changes away from pencil
  stopStoreSubscription = context.store.subscribe((state) => {
    if (state.activePlugin !== 'pencil') {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (stopStoreSubscription) stopStoreSubscription();
      listenersInstalled = false;
      stopStoreSubscription = null;
    }
  });
};

export const pencilPlugin: PluginDefinition<CanvasStore> = {
  id: 'pencil',
  metadata: {
    ...getToolMetadata('pencil'),
    disablePathInteraction: true,
  },
  handler: (_event, point, _target, context) => {
    const api = context.api as PencilPluginApi;
    api.startPath(point);
    installListeners(context, api);
  },
  keyboardShortcuts: {
    Delete: (_event, { store }) => {
      const state = store.getState() as CanvasStore;
      state.deleteSelectedElements();
    },
  },
  slices: [pencilSliceFactory],
  createApi: ({ store }) => ({
    startPath: (point: Point) => {
      startPath(point, store.getState);
    },
    addPointToPath: (point: Point) => {
      addPointToPath(point, store.getState);
    },
    finalizePath: (points: Point[]) => {
      finalizePath(points, store.getState);
    },
  }),
  expandablePanel: () => React.createElement(PencilPanel, { hideTitle: true }),
};

export type { PencilPluginSlice };
export { PencilPanel };
