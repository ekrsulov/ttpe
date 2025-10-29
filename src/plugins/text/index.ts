import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createTextPluginSlice } from './slice';
import type { TextPluginSlice } from './slice';
import { TextPanel } from './TextPanel';
import { addText } from './actions';

type TextPluginApi = {
  addText: (x: number, y: number, text: string) => Promise<void> | void;
};

const textSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createTextPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const textPlugin: PluginDefinition<CanvasStore> = {
  id: 'text',
  metadata: getToolMetadata('text'),
  handler: (_event, point, _target, context) => {
    const state = context.store.getState();
    const api = context.api as TextPluginApi;
    void api.addText(point.x, point.y, state.text?.text ?? '');
  },
  keyboardShortcuts: {
    Enter: () => {
      // Reserved for text tool specific keyboard interaction
    },
  },
  slices: [textSliceFactory],
  createApi: ({ store }) => ({
    addText: (x: number, y: number, text: string) => {
      return addText(x, y, text, store.getState);
    },
  }),
};

export type { TextPluginSlice };
export { TextPanel };
