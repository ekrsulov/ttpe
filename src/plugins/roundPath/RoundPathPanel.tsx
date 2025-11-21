import React from 'react';
import { Box } from '@chakra-ui/react';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { useCanvasStore } from '../../store/canvasStore';
import type { RoundPathPluginSlice } from './slice';

export const RoundPathPanel: React.FC = () => {
    const pathRounding = useCanvasStore((state) => (state as unknown as RoundPathPluginSlice).pathRounding);
    const selectedSubpaths = useCanvasStore((state) => (state as any).selectedSubpaths || []); // eslint-disable-line @typescript-eslint/no-explicit-any
    const updatePathRounding = useCanvasStore((state) => (state as unknown as RoundPathPluginSlice).updatePathRounding);
    const applyPathRounding = useCanvasStore((state) => (state as unknown as RoundPathPluginSlice).applyPathRounding);

    const hasSelectedSubpaths = selectedSubpaths && selectedSubpaths.length > 0;
    const roundPathLabel = hasSelectedSubpaths ? 'Round Subpath' : 'Round Path';

    return (
        <Box position="relative">
            <RenderCountBadgeWrapper componentName="RoundPathPanel" position="top-left" />
            <SectionHeader title={roundPathLabel} actionLabel="Apply" onAction={applyPathRounding} actionTitle={roundPathLabel} />

            <SliderControl
                label="Radius:"
                value={pathRounding.radius}
                min={0.1}
                max={50}
                step={0.1}
                onChange={(value) => updatePathRounding({ radius: value })}
                formatter={(value) => value.toFixed(1)}
                labelWidth="60px"
                valueWidth="40px"
                marginBottom="0"
            />
        </Box>
    );
};
