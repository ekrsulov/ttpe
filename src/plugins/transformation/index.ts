import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createTransformationPluginSlice } from './slice';
import type { TransformationPluginSlice } from './slice';
import { TransformationPanel } from './TransformationPanel';

const transformationSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createTransformationPluginSlice(set, get, api),
});

export const transformationPlugin: PluginDefinition<CanvasStore> = {
  id: 'transformation',
  metadata: getToolMetadata('transformation'),
  handler: () => {
    // Transformation tool relies on pointer event listeners elsewhere
  },
  slices: [transformationSliceFactory],
};

export type { TransformationPluginSlice };
export { TransformationPanel };
export { TransformationOverlay } from './TransformationOverlay';
export { useCanvasTransformControls } from './useCanvasTransformControls';
