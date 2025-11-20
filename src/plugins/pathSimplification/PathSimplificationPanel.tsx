import React from 'react';
import { Box } from '@chakra-ui/react';
import { SliderControl } from '../../ui/SliderControl';
import { SectionHeader } from '../../ui/SectionHeader';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';

interface PathSimplificationPanelProps {
    pathSimplification: {
        tolerance: number;
    };
    selectedSubpaths?: Array<{
        elementId: string;
        subpathIndex: number;
    }>;
    updatePathSimplification: (settings: Partial<{ tolerance: number }>) => void;
    applyPathSimplification: () => void;
}

export const PathSimplificationPanel: React.FC<PathSimplificationPanelProps> = ({
    pathSimplification,
    selectedSubpaths = [],
    updatePathSimplification,
    applyPathSimplification,
}) => {
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
