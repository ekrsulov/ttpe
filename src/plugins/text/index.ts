import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { useCanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createTextPluginSlice } from './slice';
import type { TextPluginSlice } from './slice';
import { TextPanel } from './TextPanel';

const textSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createTextPluginSlice(set, get, api),
});

export const textPlugin: PluginDefinition<CanvasStore> = {
  id: 'text',
  metadata: getToolMetadata('text'),
  handler: (_event, point) => {
    const state = useCanvasStore.getState();
    void state.addText(point.x, point.y, state.text.text);
  },
  keyboardShortcuts: {
    Enter: () => {
      // Reserved for text tool specific keyboard interaction
    },
  },
  slices: [textSliceFactory],
};

export type { TextPluginSlice };
export { TextPanel };
