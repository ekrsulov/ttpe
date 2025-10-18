import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { useCanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createTextPluginSlice } from './slice';
import type { TextPluginSlice } from './slice';
import { TextPanel } from './TextPanel';
import { addText } from './actions';

const textSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  const slice = createTextPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const textPlugin: PluginDefinition<CanvasStore> = {
  id: 'text',
  metadata: getToolMetadata('text'),
  handler: (_event, point) => {
    const state = useCanvasStore.getState();
    const api = textPlugin.api;
    if (api && api.addText) {
      void api.addText(point.x, point.y, state.text?.text ?? '');
    }
  },
  keyboardShortcuts: {
    Enter: () => {
      // Reserved for text tool specific keyboard interaction
    },
  },
  slices: [textSliceFactory],
  api: {
    addText: (x: number, y: number, text: string) => {
      return addText(x, y, text, useCanvasStore.getState);
    },
  },
};

export type { TextPluginSlice };
export { TextPanel };
