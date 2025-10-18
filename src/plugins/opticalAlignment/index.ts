import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createOpticalAlignmentSlice } from './slice';
import type { OpticalAlignmentSlice } from './slice';
import { OpticalAlignmentPanel } from './OpticalAlignmentPanel';

const opticalAlignmentSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createOpticalAlignmentSlice(set, get, api),
});

export const opticalAlignmentPlugin: PluginDefinition<CanvasStore> = {
  id: 'opticalAlignment',
  metadata: {
    label: 'Optical Alignment',
    cursor: 'default',
  },
  slices: [opticalAlignmentSliceFactory],
};

export type { OpticalAlignmentSlice };
export { OpticalAlignmentPanel };
