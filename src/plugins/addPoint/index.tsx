
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createAddPointPluginSlice } from './slice';
import type { AddPointPluginSlice } from './slice';

import { AddPointPanel } from './AddPointPanel';
import { AddPointFeedbackOverlay } from './AddPointFeedbackOverlay';
export type { AddPointPluginSlice };

const addPointSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
    const slice = createAddPointPluginSlice(set, get, api);
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
    relatedPluginPanels: [
        {
            id: 'addPoint-edit-panel',
            targetPlugin: 'edit',
            component: AddPointPanel,
            order: 1,
        },
    ],
    canvasLayers: [
        {
            id: 'add-point-feedback',
            placement: 'foreground',
            render: ({ activePlugin, viewport, addPointMode }) => {
                // Only show when in edit mode and add point mode is active
                // Note: activePlugin check might need to be adjusted if we want this to work in other contexts
                if (activePlugin !== 'edit' || !addPointMode?.isActive) {
                    return null;
                }

                return (
                    <AddPointFeedbackOverlay
                        hoverPosition={addPointMode.hoverPosition}
                        isActive={addPointMode.isActive}
                        viewport={viewport}
                    />
                );
            },
        },
    ],
};
