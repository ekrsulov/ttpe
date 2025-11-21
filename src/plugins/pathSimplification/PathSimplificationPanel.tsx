import React from 'react';
import { Box } from '@chakra-ui/react';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { useCanvasStore } from '../../store/canvasStore';
import type { PathSimplificationPluginSlice } from './slice';

export const PathSimplificationPanel: React.FC = () => {
    const pathSimplification = useCanvasStore((state) => (state as unknown as PathSimplificationPluginSlice).pathSimplification);
    const selectedSubpaths = useCanvasStore((state) => (state as any).selectedSubpaths || []); // eslint-disable-line @typescript-eslint/no-explicit-any
    const updatePathSimplification = useCanvasStore((state) => (state as unknown as PathSimplificationPluginSlice).updatePathSimplification);
    const applyPathSimplification = useCanvasStore((state) => (state as unknown as PathSimplificationPluginSlice).applyPathSimplification);

    const hasSelectedSubpaths = selectedSubpaths && selectedSubpaths.length > 0;
    const pathSimplificationLabel = hasSelectedSubpaths ? 'Subpath Simplification' : 'Path Simplification';

    return (
        <Box position="relative">
            <RenderCountBadgeWrapper componentName="PathSimplificationPanel" position="top-left" />
            <SectionHeader
                title={pathSimplificationLabel}
                actionLabel="Apply"
                onAction={applyPathSimplification}
                actionTitle={pathSimplificationLabel}
            />

            <SliderControl
                label="Tolerance:"
                value={pathSimplification.tolerance}
                min={0.01}
                max={10}
                step={0.01}
                onChange={(value) => updatePathSimplification({ tolerance: value })}
                formatter={(value) => value.toFixed(2)}
                labelWidth="60px"
                valueWidth="40px"
                marginBottom="0"
            />
        </Box>
    );
};
