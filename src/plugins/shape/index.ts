import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createShapePluginSlice } from './slice';
import type { ShapePluginSlice } from './slice';
import { ShapePanel } from './ShapePanel';

const shapeSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createShapePluginSlice(set, get, api),
});

export const shapePlugin: PluginDefinition<CanvasStore> = {
  id: 'shape',
  metadata: getToolMetadata('shape'),
  handler: (_event, point, _target, _isSmoothBrushActive, _beginSelectionRectangle, startShapeCreation) => {
    startShapeCreation(point);
  },
  keyboardShortcuts: {
    Escape: () => {
      // Reserved for cancelling shape creation
    },
  },
  slices: [shapeSliceFactory],
};

export type { ShapePluginSlice };
export { ShapePanel };
