/* eslint-disable react-refresh/only-export-components */
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createSmoothBrushPluginSlice } from './slice';

export { SmoothBrushPanel } from './SmoothBrushPanel';
export { SmoothBrushCursor } from './SmoothBrushCursor';
export type { SmoothBrushPluginSlice, SmoothBrush } from './slice';

const smoothBrushSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slice = createSmoothBrushPluginSlice(set as any, get as any, api as any);
    return {
        state: slice,
    };
};

export const smoothBrushPlugin: PluginDefinition<CanvasStore> = {
    id: 'smoothBrush',
    metadata: {
        label: 'Smooth Brush',
        cursor: 'default',
    },
    slices: [smoothBrushSliceFactory],
};
