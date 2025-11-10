import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createShapePluginSlice } from './slice';
import type { ShapePluginSlice } from './slice';
import React from 'react';
import { ShapePanel } from './ShapePanel';
import { ShapePreview } from './ShapePreview';
import { BlockingOverlay } from '../../overlays';
import { createShape } from './actions';
import type { Point } from '../../types';

const shapeSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createShapePluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

export const shapePlugin: PluginDefinition<CanvasStore> = {
  id: 'shape',
  metadata: getToolMetadata('shape'),
  handler: (
    _event,
    point,
    _target,
    context
  ) => {
    context.helpers.startShapeCreation?.(point);
  },
  keyboardShortcuts: {
    Escape: () => {
      // Reserved for cancelling shape creation
    },
  },
  canvasLayers: [
    {
      id: 'shape-blocking-overlay',
      placement: 'midground',
      render: ({ viewport, canvasSize, isCreatingShape }) => (
        <BlockingOverlay
          viewport={viewport}
          canvasSize={canvasSize}
          isActive={isCreatingShape}
        />
      ),
    },
    {
      id: 'shape-preview',
      placement: 'midground',
      render: (context) => {
        const isCreatingShape = context.isCreatingShape as boolean | undefined;
        const shapeStart = context.shapeStart as Point | undefined;
        const shapeEnd = context.shapeEnd as Point | undefined;
        const shape = context.shape as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        const viewport = context.viewport as any; // eslint-disable-line @typescript-eslint/no-explicit-any
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
  createApi: ({ store }) => ({
    createShape: (startPoint: Point, endPoint: Point) => {
      createShape(startPoint, endPoint, store.getState);
    },
  }),
  expandablePanel: () => React.createElement(ShapePanel, { hideTitle: true }),
};

export type { ShapePluginSlice };
export { ShapePanel };
