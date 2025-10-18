import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createShapePluginSlice } from './slice';
import type { ShapePluginSlice } from './slice';
import { ShapePanel } from './ShapePanel';
import { ShapePreview } from './ShapePreview';

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
  canvasLayers: [
    {
      id: 'shape-preview',
      placement: 'midground',
      render: ({ isCreatingShape, shapeStart, shapeEnd, shape, viewport }) => {
        if (!isCreatingShape || !shapeStart || !shapeEnd) {
          return null;
        }

        return (
          <ShapePreview
            selectedShape={shape?.selectedShape}
            shapeStart={shapeStart}
            shapeEnd={shapeEnd}
            viewport={viewport}
          />
        );
      },
    },
  ],
  slices: [shapeSliceFactory],
};

export type { ShapePluginSlice };
export { ShapePanel };
