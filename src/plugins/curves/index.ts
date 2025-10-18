import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createCurvesPluginSlice } from './slice';
import type { CurvesPluginSlice } from './slice';
import { CurvesPanel } from './CurvesPanel';
import { getToolMetadata } from '../toolMetadata';

const curvesSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createCurvesPluginSlice(set, get, api),
});

export const curvesPlugin: PluginDefinition<CanvasStore> = {
  id: 'curves',
  metadata: getToolMetadata('curves'),
  handler: () => {
    // Curves tool relies on dedicated canvas interactions
  },
  slices: [curvesSliceFactory],
};

export type { CurvesPluginSlice };
export { CurvesPanel };
export { CurvesRenderer } from './CurvesRenderer';
export { useCanvasCurves } from './useCanvasCurves';
