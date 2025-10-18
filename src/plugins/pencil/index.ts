import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { useCanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createPencilPluginSlice } from './slice';
import type { PencilPluginSlice } from './slice';
import { PencilPanel } from './PencilPanel';

const pencilSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createPencilPluginSlice(set, get, api),
});

export const pencilPlugin: PluginDefinition<CanvasStore> = {
  id: 'pencil',
  metadata: getToolMetadata('pencil'),
  handler: (_event, point) => {
    useCanvasStore.getState().startPath(point);
  },
  keyboardShortcuts: {
    Delete: () => {
      useCanvasStore.getState().deleteSelectedElements();
    },
  },
  slices: [pencilSliceFactory],
};

export type { PencilPluginSlice };
export { PencilPanel };
