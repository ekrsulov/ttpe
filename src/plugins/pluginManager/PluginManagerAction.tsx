import React from 'react';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { useCanvasStore } from '../../store/canvasStore';
import type { PluginManagerSlice } from './slice';

export const PluginManagerAction: React.FC = () => {
    const setDialogOpen = useCanvasStore(
        (state) => (state as unknown as PluginManagerSlice).setPluginManagerDialogOpen
    );

    return (
        <PanelStyledButton onClick={() => setDialogOpen(true)} width="100%">
            Manage Plugins
        </PanelStyledButton>
    );
};
