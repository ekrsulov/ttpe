import React from 'react';
import { Box, Flex, Heading, HStack } from '@chakra-ui/react';
import { SliderControl } from '../../ui/SliderControl';
import { PercentSliderControl } from '../../ui/PercentSliderControl';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { useCanvasStore } from '../../store/canvasStore';
import type { SmoothBrushPluginSlice } from './slice';


export const SmoothBrushPanel: React.FC = () => {
    const smoothBrush = useCanvasStore((state) => (state as unknown as SmoothBrushPluginSlice).smoothBrush);
    const selectedCommands = useCanvasStore((state) => (state as any).selectedCommands || []); // eslint-disable-line @typescript-eslint/no-explicit-any
    const updateSmoothBrush = useCanvasStore((state) => (state as unknown as SmoothBrushPluginSlice).updateSmoothBrush);
    const applySmoothBrush = useCanvasStore((state) => (state as unknown as SmoothBrushPluginSlice).applySmoothBrush);
    const activateSmoothBrush = useCanvasStore((state) => (state as unknown as SmoothBrushPluginSlice).activateSmoothBrush);
    const deactivateSmoothBrush = useCanvasStore((state) => (state as unknown as SmoothBrushPluginSlice).deactivateSmoothBrush);
    const resetSmoothBrush = useCanvasStore((state) => (state as unknown as SmoothBrushPluginSlice).resetSmoothBrush);

    return (
        <Box position="relative">
            <RenderCountBadgeWrapper componentName="SmoothBrushPanel" position="top-left" />
            <Flex justify="space-between" align="center" mb={1}>
                <Heading size="xs" fontWeight="extrabold">
                    Smooth Brush
                </Heading>
                <HStack spacing={2}>
                    {!smoothBrush.isActive && (
                        <PanelStyledButton
                            onClick={() => applySmoothBrush()}
                            size="xs"
                            title={
                                smoothBrush.isActive && selectedCommands.length > 0
                                    ? `Apply Smooth to ${selectedCommands.length} Selected Point${selectedCommands.length === 1 ? '' : 's'}`
                                    : 'Apply Smooth Brush'
                            }
                        >
                            Apply
                        </PanelStyledButton>
                    )}
                    <PanelSwitch
                        isChecked={smoothBrush.isActive}
                        onChange={(e) => {
                            if (e.target.checked) {
                                activateSmoothBrush();
                            } else {
                                deactivateSmoothBrush();
                            }
                        }}
                    />
                </HStack>
            </Flex>

            {/* Simplify Points Checkbox */}
            <HStack justify="space-between" align="center">
                <PanelToggle
                    isChecked={smoothBrush.simplifyPoints}
                    onChange={(e) => updateSmoothBrush({ simplifyPoints: e.target.checked })}
                >
                    Simplify Points
                </PanelToggle>
                <PanelStyledButton onClick={resetSmoothBrush} size="xs" title="Reset all smooth brush settings to defaults" mb="2px">
                    Reset
                </PanelStyledButton>
            </HStack>

            {/* Strength Slider */}
            <PercentSliderControl
                label="Strength:"
                value={smoothBrush.strength}
                step={0.01}
                onChange={(value) => updateSmoothBrush({ strength: value })}
                labelWidth="60px"
                valueWidth="40px"
                marginBottom={smoothBrush.isActive || smoothBrush.simplifyPoints ? '2px' : '0'}
            />

            {/* Radius Slider - only show when brush mode is active */}
            {smoothBrush.isActive && (
                <SliderControl
                    label="Radius:"
                    value={smoothBrush.radius}
                    min={6}
                    max={60}
                    step={1}
                    onChange={(value) => updateSmoothBrush({ radius: value })}
                    labelWidth="60px"
                    valueWidth="40px"
                    marginBottom="2px"
                />
            )}

            {/* Simplification Tolerance Slider - only show when simplify points is enabled */}
            {smoothBrush.simplifyPoints && (
                <SliderControl
                    label="Tolerance:"
                    value={smoothBrush.simplificationTolerance}
                    min={0.1}
                    max={10}
                    step={0.1}
                    onChange={(value) => updateSmoothBrush({ simplificationTolerance: value })}
                    formatter={(value) => value.toFixed(1)}
                    labelWidth="60px"
                    valueWidth="40px"
                    marginBottom="2px"
                />
            )}

            {/* Minimum Distance Slider - only show when simplify points is enabled */}
            {smoothBrush.simplifyPoints && (
                <SliderControl
                    label="Min Dist:"
                    value={smoothBrush.minDistance}
                    min={0.1}
                    max={5.0}
                    step={0.1}
                    onChange={(value) => updateSmoothBrush({ minDistance: value })}
                    formatter={(value) => value.toFixed(1)}
                    labelWidth="60px"
                    valueWidth="40px"
                    marginBottom="0"
                />
            )}
        </Box>
    );
};
