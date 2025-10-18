import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createCurvesPluginSlice } from './slice';
import type { CurvesPluginSlice } from './slice';
import { CurvesPanel } from './CurvesPanel';
import { getToolMetadata } from '../toolMetadata';
import { CurvesRenderer } from './CurvesRenderer';

const curvesSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  const slice = createCurvesPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const curvesPlugin: PluginDefinition<CanvasStore> = {
  id: 'curves',
  metadata: getToolMetadata('curves'),
  handler: () => {
    // Curves tool relies on dedicated canvas interactions
  },
  canvasLayers: [
    {
      id: 'curves-renderer',
      placement: 'midground',
      render: ({ activePlugin }) => (activePlugin === 'curves' ? <CurvesRenderer /> : null),
    },
  ],
  slices: [curvesSliceFactory],
};

export type { CurvesPluginSlice };
export { CurvesPanel };
export { CurvesRenderer } from './CurvesRenderer';
export { useCanvasCurves } from './useCanvasCurves';
