/* eslint-disable react-refresh/only-export-components */
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createSmoothBrushPluginSlice } from './slice';

import { SmoothBrushPanel } from './SmoothBrushPanel';
export { SmoothBrushPanel };
import { SmoothBrushCursor } from './SmoothBrushCursor';
export { SmoothBrushCursor };
export type { SmoothBrushPluginSlice, SmoothBrush } from './slice';

const smoothBrushSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
    const slice = createSmoothBrushPluginSlice(set, get, api);
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
    relatedPluginPanels: [
        {
            id: 'smoothBrush-edit-panel',
            targetPlugin: 'edit',
            component: SmoothBrushPanel,
            order: 2,
        },
    ],
    canvasLayers: [
        {
            id: 'smooth-brush-cursor',
            placement: 'foreground',
            render: ({ activePlugin }) => {
                if (activePlugin !== 'edit') {
                    return null;
                }
                return <SmoothBrushCursor />;
            },
        },
    ],
};
