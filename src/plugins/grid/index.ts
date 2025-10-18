import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createGridPluginSlice } from './slice';
import type { GridPluginSlice } from './slice';
import GridPanelComponent from './GridPanel';

const gridSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createGridPluginSlice(set, get, api),
});

export const gridPlugin: PluginDefinition<CanvasStore> = {
  id: 'grid',
  metadata: {
    label: 'Grid',
    cursor: 'default',
  },
  slices: [gridSliceFactory],
};

export type { GridPluginSlice };
export { GridPanelComponent as GridPanel };
export { GridOverlay } from './GridOverlay';
