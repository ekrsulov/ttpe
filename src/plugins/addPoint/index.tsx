/* eslint-disable react-refresh/only-export-components */
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createAddPointPluginSlice } from './slice';
import type { AddPointPluginSlice } from './slice';

export { AddPointPanel } from './AddPointPanel';
export type { AddPointPluginSlice };

const addPointSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slice = createAddPointPluginSlice(set as any, get as any, api as any);
    return {
        state: slice,
    };
};

export const addPointPlugin: PluginDefinition<CanvasStore> = {
    id: 'addPoint',
    metadata: {
        label: 'Add Point',
        cursor: 'default',
    },
    slices: [addPointSliceFactory],
};
