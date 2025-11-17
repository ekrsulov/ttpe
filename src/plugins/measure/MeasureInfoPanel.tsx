import React from 'react';
import { VStack, HStack, Text, Box } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { SliderControl } from '../../ui/SliderControl';
import { usePanelToggleHandlers } from '../../hooks/usePanelToggleHandlers';
import type { MeasurePluginSlice } from './slice';

interface MeasureInfoPanelProps {
  hideTitle?: boolean;
}

/**
 * Format a numeric value to a fixed number of decimal places
 */
function formatValue(value: number, decimals: number = 1): string {
  return value.toFixed(decimals);
}

/**
 * Format distance based on units
 */
function formatDistance(value: number, units: 'px' | 'mm' | 'in', precision: number): string {
  switch (units) {
    case 'mm':
      return `${(value * 25.4 / 96).toFixed(precision)} mm`;
    case 'in':
      return `${(value / 96).toFixed(precision)} in`;
    case 'px':
    default:
      return `${value.toFixed(precision)} px`;
  }
}

/**
 * Format angle to show in degrees
 */
function formatAngle(angle: number, precision: number): string {
  return `${angle.toFixed(precision)}°`;
}

export const MeasureInfoPanel: React.FC<MeasureInfoPanelProps> = ({ hideTitle = false }) => {
  const measure = useCanvasStore((state) => (state as unknown as MeasurePluginSlice).measure);
  const precision = useCanvasStore((state) => state.settings.keyboardMovementPrecision);
  const updateMeasureState = useCanvasStore((state) => (state as unknown as MeasurePluginSlice).updateMeasureState);

  const { createToggleHandler } = usePanelToggleHandlers(updateMeasureState ?? (() => {}));
  const handleToggleSnapPoints = createToggleHandler('showSnapPoints');

  const { measurement, units, showSnapPoints, snapPointsOpacity } = measure || {};
  const { distance, deltaX, deltaY, angle, isActive } = measurement || {};

  if (!isActive) {
    return (
      <Panel title="Measure" hideHeader={hideTitle}>
        <VStack spacing={2} align="stretch">
          <Text fontSize="12px" color="gray.500" _dark={{ color: 'gray.500' }} textAlign="center">
            Click and drag to measure
          </Text>

          {/* Snap Points Configuration */}
          <Box height="1px" bg="gray.200" _dark={{ bg: 'gray.700' }} my={1} />
          
          <PanelToggle
            isChecked={showSnapPoints ?? true}
            onChange={handleToggleSnapPoints}
          >
            Show Snap Points
          </PanelToggle>

          {showSnapPoints && (
            <Box>
              <SliderControl
                label="Opacity:"
                value={snapPointsOpacity ?? 50}
                min={10}
                max={100}
                step={5}
                onChange={(value) => updateMeasureState?.({ snapPointsOpacity: value })}
                labelWidth="70px"
                valueWidth="40px"
                marginBottom="0"
              />
            </Box>
          )}
        </VStack>
      </Panel>
    );
  }

  return (
    <Panel title="Measure" hideHeader={hideTitle}>
      <VStack spacing={2} align="stretch">
        {/* Distance */}
        <HStack justify="space-between">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }} fontWeight="600">
            Distance:
          </Text>
          <Text fontSize="12px" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
            {formatDistance(distance || 0, units || 'px', precision)}
          </Text>
        </HStack>

        {/* Delta X */}
        <HStack justify="space-between">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            ΔX:
          </Text>
          <Text fontSize="12px" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
            {formatDistance(Math.abs(deltaX || 0), units || 'px', precision)}
          </Text>
        </HStack>

        {/* Delta Y */}
        <HStack justify="space-between">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            ΔY:
          </Text>
          <Text fontSize="12px" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
            {formatDistance(Math.abs(deltaY || 0), units || 'px', precision)}
          </Text>
        </HStack>

        {/* Angle */}
        <HStack justify="space-between">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            Angle:
          </Text>
          <Text fontSize="12px" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
            {formatAngle(angle || 0, precision)}
          </Text>
        </HStack>

        {/* Divider */}
        <Box height="1px" bg="gray.200" _dark={{ bg: 'gray.700' }} my={1} />

        {/* Info about coordinates */}
        {measurement?.startPoint && measurement?.endPoint && (
          <VStack spacing={1} align="stretch" fontSize="11px" color="gray.500" _dark={{ color: 'gray.500' }}>
            <Text>
              From: ({formatValue(measurement.startPoint.x)}, {formatValue(measurement.startPoint.y)})
            </Text>
            <Text>
              To: ({formatValue(measurement.endPoint.x)}, {formatValue(measurement.endPoint.y)})
            </Text>
          </VStack>
        )}

        {/* Snap Points Configuration */}
        <Box height="1px" bg="gray.200" _dark={{ bg: 'gray.700' }} my={1} />
        
        <PanelToggle
          isChecked={showSnapPoints ?? true}
          onChange={handleToggleSnapPoints}
        >
          Show Snap Points
        </PanelToggle>

        {showSnapPoints && (
          <Box>
            <SliderControl
              label="Opacity:"
              value={snapPointsOpacity ?? 50}
              min={10}
              max={100}
              step={5}
              onChange={(value) => updateMeasureState?.({ snapPointsOpacity: value })}
              labelWidth="70px"
              valueWidth="40px"
              marginBottom="0"
            />
          </Box>
        )}
      </VStack>
    </Panel>
  );
};
