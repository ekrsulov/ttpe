
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createRoundPathPluginSlice } from './slice';
import type { RoundPathPluginSlice } from './slice';

import { RoundPathPanel } from './RoundPathPanel';
export type { RoundPathPluginSlice };

const roundPathSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slice = createRoundPathPluginSlice(set as any, get as any, api as any);
    return {
        state: slice,
    };
};

export const roundPathPlugin: PluginDefinition<CanvasStore> = {
    id: 'roundPath',
    metadata: {
        label: 'Round Path',
        cursor: 'default',
    },
    slices: [roundPathSliceFactory],
    relatedPluginPanels: [
        {
            id: 'roundPath-edit-panel',
            targetPlugin: 'edit',
            component: RoundPathPanel,
            order: 4,
        },
    ],
};
