/* eslint-disable react-refresh/only-export-components */
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPathSimplificationPluginSlice } from './slice';
import type { PathSimplificationPluginSlice } from './slice';

export { PathSimplificationPanel } from './PathSimplificationPanel';
export type { PathSimplificationPluginSlice };

const pathSimplificationSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slice = createPathSimplificationPluginSlice(set as any, get as any, api as any);
    return {
        state: slice,
    };
};

export const pathSimplificationPlugin: PluginDefinition<CanvasStore> = {
    id: 'pathSimplification',
    metadata: {
        label: 'Path Simplification',
        cursor: 'default',
    },
    slices: [pathSimplificationSliceFactory],
};
