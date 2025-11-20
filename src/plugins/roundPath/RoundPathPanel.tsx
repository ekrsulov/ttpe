import React from 'react';
import { Box } from '@chakra-ui/react';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';

interface RoundPathPanelProps {
    pathRounding: {
        radius: number;
    };
    selectedSubpaths?: Array<{
        elementId: string;
        subpathIndex: number;
    }>;
    updatePathRounding: (settings: Partial<{ radius: number }>) => void;
    applyPathRounding: () => void;
}

export const RoundPathPanel: React.FC<RoundPathPanelProps> = ({
    pathRounding,
    selectedSubpaths = [],
    updatePathRounding,
    applyPathRounding,
}) => {
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
