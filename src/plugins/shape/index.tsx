import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { useCanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createShapePluginSlice } from './slice';
import type { ShapePluginSlice } from './slice';
import { ShapePanel } from './ShapePanel';
import { ShapePreview } from './ShapePreview';
import { createShape } from './actions';
import type { Point } from '../../types';

const shapeSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  const slice = createShapePluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

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
  api: {
    createShape: (startPoint: Point, endPoint: Point) => {
      createShape(startPoint, endPoint, useCanvasStore.getState);
    },
  },
};

export type { ShapePluginSlice };
export { ShapePanel };
