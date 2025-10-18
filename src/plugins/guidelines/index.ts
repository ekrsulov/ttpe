import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createGuidelinesPluginSlice } from './slice';
import type { GuidelinesPluginSlice } from './slice';
import { GuidelinesPanel } from './GuidelinesPanel';

const guidelinesSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createGuidelinesPluginSlice(set, get, api),
});

export const guidelinesPlugin: PluginDefinition<CanvasStore> = {
  id: 'guidelines',
  metadata: {
    label: 'Guidelines',
    cursor: 'default',
  },
  slices: [guidelinesSliceFactory],
};

export type { GuidelinesPluginSlice };
export { GuidelinesPanel };
