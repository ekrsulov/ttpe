import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createGridPluginSlice } from './slice';
import type { GridPluginSlice } from './slice';
import GridPanelComponent from './GridPanel';
import { GridOverlay } from './GridOverlay';

const gridSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createGridPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const gridPlugin: PluginDefinition<CanvasStore> = {
  id: 'grid',
  metadata: {
    label: 'Grid',
    cursor: 'default',
  },
  canvasLayers: [
    {
      id: 'grid-overlay',
      placement: 'background',
      render: ({ grid, viewport, canvasSize }) => (
        <GridOverlay grid={grid ?? { enabled: false, type: 'square', spacing: 20, showRulers: false }} viewport={viewport} canvasSize={canvasSize} />
      ),
    },
  ],
  slices: [gridSliceFactory],
};

export type { GridPluginSlice };
export { GridPanelComponent as GridPanel };
export { GridOverlay } from './GridOverlay';
