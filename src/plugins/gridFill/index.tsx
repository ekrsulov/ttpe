import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { PaintBucket } from 'lucide-react';
import { fillGridCell } from './actions';
import type { Point } from '../../types';

type GridFillPluginApi = {
  fillGridCell: (point: Point) => string | null;
};

export const gridFillPlugin: PluginDefinition<CanvasStore> = {
  id: 'gridFill',
  metadata: {
    label: 'Grid Fill',
    icon: PaintBucket,
    cursor: 'crosshair',
  },
  toolDefinition: { order: 10 },
  handler: (_event, point, _target, context) => {
    const api = context.api as GridFillPluginApi;
    api.fillGridCell(point);
  },
  keyboardShortcuts: {
    Delete: (_event, { store }) => {
      const state = store.getState() as CanvasStore;
      state.deleteSelectedElements();
    },
  },
  slices: [],
  createApi: ({ store }) => ({
    fillGridCell: (point: Point) => {
      return fillGridCell(point, store.getState);
    },
  }),
};
