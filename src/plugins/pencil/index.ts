import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { useCanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createPencilPluginSlice } from './slice';
import type { PencilPluginSlice } from './slice';
import { PencilPanel } from './PencilPanel';
import { startPath, addPointToPath } from './actions';
import type { Point } from '../../types';

const pencilSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // Call the slice creator and cast appropriately
  const slice = createPencilPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const pencilPlugin: PluginDefinition<CanvasStore> = {
  id: 'pencil',
  metadata: getToolMetadata('pencil'),
  handler: (_event, point) => {
    // Use the plugin API instead of store action
    const api = pencilPlugin.api;
    if (api && api.startPath) {
      api.startPath(point);
    }
  },
  keyboardShortcuts: {
    Delete: (_event, { store }) => {
      const state = store.getState() as CanvasStore;
      state.deleteSelectedElements();
    },
  },
  slices: [pencilSliceFactory],
  api: {
    startPath: (point: Point) => {
      startPath(point, useCanvasStore.getState);
    },
    addPointToPath: (point: Point) => {
      addPointToPath(point, useCanvasStore.getState);
    },
  },
};

export type { PencilPluginSlice };
export { PencilPanel };
