import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { getToolMetadata } from '../toolMetadata';
import { createGridFillPluginSlice } from './slice';
import type { GridFillPluginSlice } from './slice';
import { GridFillPanel } from './GridFillPanel';
import { fillGridCell } from './actions';
import type { Point } from '../../types';

/* eslint-disable react-refresh/only-export-components */

type GridFillPluginApi = {
  fillGridCell: (point: Point) => string | null;
};

const gridFillSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createGridFillPluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
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
  slices: [gridFillSliceFactory],
  createApi: ({ store }) => ({
    fillGridCell: (point: Point) => {
      return fillGridCell(point, store.getState);
    },
  }),
};

export type { GridFillPluginSlice };
export { GridFillPanel };
