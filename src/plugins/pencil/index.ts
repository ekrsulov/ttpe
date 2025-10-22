import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createPencilPluginSlice } from './slice';
import type { PencilPluginSlice } from './slice';
import { PencilPanel } from './PencilPanel';
import { startPath, addPointToPath } from './actions';
import type { Point } from '../../types';

type PencilPluginApi = {
  startPath: (point: Point) => void;
  addPointToPath: (point: Point) => void;
};

const pencilSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // Call the slice creator and cast appropriately
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createPencilPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const pencilPlugin: PluginDefinition<CanvasStore> = {
  id: 'pencil',
  metadata: getToolMetadata('pencil'),
  handler: (_event, point, _target, _isSmoothBrushActive, _beginSelectionRectangle, _startShapeCreation, context) => {
    const api = context.api as PencilPluginApi;
    api.startPath(point);
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
  }),
};

export type { PencilPluginSlice };
export { PencilPanel };
