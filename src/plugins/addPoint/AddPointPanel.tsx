import React from 'react';
import { Box, Flex, Heading } from '@chakra-ui/react';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';

interface AddPointPanelProps {
    addPointMode?: {
        isActive: boolean;
    };
    activateAddPointMode?: () => void;
    deactivateAddPointMode?: () => void;
}

export const AddPointPanel: React.FC<AddPointPanelProps> = ({
    addPointMode,
    activateAddPointMode,
    deactivateAddPointMode,
}) => {
    return (
        <Box position="relative">
            <RenderCountBadgeWrapper componentName="AddPointPanel" position="top-left" />
            <Flex justify="space-between" align="center">
                <Heading size="xs" fontWeight="extrabold">
                    Add Point
                </Heading>
                <PanelSwitch
                    isChecked={addPointMode?.isActive || false}
                    onChange={(e) => {
                        if (e.target.checked) {
                            activateAddPointMode?.();
                        } else {
                            deactivateAddPointMode?.();
                        }
                    }}
                />
            </Flex>
        </Box>
    );
};
