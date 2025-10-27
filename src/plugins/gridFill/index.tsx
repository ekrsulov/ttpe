import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { fillGridCell } from './actions';
import type { Point } from '../../types';

/* eslint-disable react-refresh/only-export-components */

type GridFillPluginApi = {
  fillGridCell: (point: Point) => string | null;
};

export const gridFillPlugin: PluginDefinition<CanvasStore> = {
  id: 'gridFill',
  metadata: getToolMetadata('gridFill'),
  handler: (_event, point, _target, _isSmoothBrushActive, _beginSelectionRectangle, _startShapeCreation, context) => {
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
