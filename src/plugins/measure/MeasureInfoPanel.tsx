import React, { useEffect, useState } from 'react';
import { VStack, HStack, Text, Box } from '@chakra-ui/react';
import { PanelToggleGroup } from '../../ui/PanelToggleGroup';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PercentSliderControl } from '../../ui/PercentSliderControl';
import { usePanelToggleHandlers } from '../../hooks/usePanelToggleHandlers';
import useDebouncedCallback from '../../hooks/useDebouncedCallback';
import type { MeasurePluginSlice } from './slice';

interface SnapPointsControlsProps {
  showSnapPoints?: boolean;
  snapPointsOpacity?: number;
  onToggleSnapPoints: (e: React.ChangeEvent<HTMLInputElement>) => void;
  updateMeasureState?: (state: Partial<MeasurePluginSlice['measure']>) => void;
  snapToAnchors?: boolean;
  snapToMidpoints?: boolean;
  snapToEdges?: boolean;
  snapToBBoxCorners?: boolean;
  snapToBBoxCenter?: boolean;
  snapToIntersections?: boolean;
  onToggleAnchors?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleMidpoints?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleEdges?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleBBoxCorners?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleBBoxCenter?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleIntersections?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SnapPointsControls: React.FC<SnapPointsControlsProps> = ({
  showSnapPoints,
  snapPointsOpacity,
  onToggleSnapPoints,
  updateMeasureState,
  snapToAnchors,
  snapToMidpoints,
  snapToEdges,
  snapToBBoxCorners,
  snapToBBoxCenter,
  snapToIntersections,
  onToggleAnchors,
  onToggleMidpoints,
  onToggleEdges,
  onToggleBBoxCorners,
  onToggleBBoxCenter,
  onToggleIntersections,
}) => {
  const [localOpacity, setLocalOpacity] = useState((snapPointsOpacity ?? 50) / 100);

  useEffect(() => {
    setLocalOpacity((snapPointsOpacity ?? 50) / 100);
  }, [snapPointsOpacity]);

  const debouncedCommit = useDebouncedCallback((value: number) => {
    updateMeasureState?.({ snapPointsOpacity: Math.round(value * 100) });
  }, 200);

  const handleOpacityChange = (value: number) => {
    setLocalOpacity(value);
    debouncedCommit(value);
  };

  return (
    <VStack spacing={1} align="stretch">
      <PanelToggle
        isChecked={showSnapPoints ?? false}
        onChange={onToggleSnapPoints}
      >
        Show Snap Points
      </PanelToggle>

      {showSnapPoints && (
        <Box>
          {/* Snap type toggles */}
          <PanelToggleGroup
            toggles={[
              { label: 'Anchor', isChecked: snapToAnchors ?? true, onChange: onToggleAnchors ?? (() => {}) },
              { label: 'Mid', isChecked: snapToMidpoints ?? true, onChange: onToggleMidpoints ?? (() => {}) },
              { label: 'Edge', isChecked: snapToEdges ?? true, onChange: onToggleEdges ?? (() => {}) },
            ]}
            spacing={3}
          />
          <PanelToggleGroup
            toggles={[
              { label: 'Corner', isChecked: snapToBBoxCorners ?? true, onChange: onToggleBBoxCorners ?? (() => {}) },
              { label: 'Center', isChecked: snapToBBoxCenter ?? true, onChange: onToggleBBoxCenter ?? (() => {}) },
              { label: 'Inter', isChecked: snapToIntersections ?? true, onChange: onToggleIntersections ?? (() => {}) },
            ]}
            spacing={3}
          />
          <PercentSliderControl
            label="Opacity:"
            value={localOpacity}
            step={0.1}
            decimals={0}
            onChange={handleOpacityChange}
            labelWidth="50px"
            valueWidth="40px"
            marginBottom="0"
          />
        </Box>
      )}
    </VStack>
  );
};


interface MeasureInfoPanelProps {
  hideTitle?: boolean;
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
  const handleToggleAnchors = createToggleHandler('snapToAnchors');
  const handleToggleMidpoints = createToggleHandler('snapToMidpoints');
  const handleToggleEdges = createToggleHandler('snapToEdges');
  const handleToggleBBoxCorners = createToggleHandler('snapToBBoxCorners');
  const handleToggleBBoxCenter = createToggleHandler('snapToBBoxCenter');
  const handleToggleIntersections = createToggleHandler('snapToIntersections');

  const { measurement, units, showSnapPoints, snapPointsOpacity, snapToAnchors, snapToMidpoints, snapToEdges, snapToBBoxCorners, snapToBBoxCenter, snapToIntersections } = measure || {};
  const { distance, deltaX, deltaY, angle, isActive } = measurement || {};
  const startPoint = measurement?.startPoint;
  const endPoint = measurement?.endPoint;

  // We will provide a top-level SnapPointsControls component (see below) that
  // receives the necessary props from the MeasureInfoPanel - this avoids
  // nested hooks and related lint warnings.

  if (!isActive && !(startPoint && endPoint)) {
    return (
      <Panel title="Measure" hideHeader={hideTitle}>
        <VStack spacing={1} align="stretch">
          <SnapPointsControls
            showSnapPoints={showSnapPoints}
            snapPointsOpacity={snapPointsOpacity}
            onToggleSnapPoints={handleToggleSnapPoints}
            updateMeasureState={updateMeasureState}
            snapToAnchors={snapToAnchors}
            snapToMidpoints={snapToMidpoints}
            snapToEdges={snapToEdges}
            snapToBBoxCorners={snapToBBoxCorners}
            snapToBBoxCenter={snapToBBoxCenter}
            snapToIntersections={snapToIntersections}
            onToggleAnchors={handleToggleAnchors}
            onToggleMidpoints={handleToggleMidpoints}
            onToggleEdges={handleToggleEdges}
            onToggleBBoxCorners={handleToggleBBoxCorners}
            onToggleBBoxCenter={handleToggleBBoxCenter}
            onToggleIntersections={handleToggleIntersections}
          />
          <Text fontSize="12px" color="gray.500" _dark={{ color: 'gray.500' }} textAlign="left">
            Click and drag to measure
          </Text>
        </VStack>
      </Panel>
    );
  }

  return (
    <Panel title="Measure" hideHeader={hideTitle}>
      <VStack spacing={0} align="stretch">
        <SnapPointsControls
          showSnapPoints={showSnapPoints}
          snapPointsOpacity={snapPointsOpacity}
          onToggleSnapPoints={handleToggleSnapPoints}
          updateMeasureState={updateMeasureState}
          snapToAnchors={snapToAnchors}
          snapToMidpoints={snapToMidpoints}
          snapToEdges={snapToEdges}
          snapToBBoxCorners={snapToBBoxCorners}
          snapToBBoxCenter={snapToBBoxCenter}
          snapToIntersections={snapToIntersections}
          onToggleAnchors={handleToggleAnchors}
          onToggleMidpoints={handleToggleMidpoints}
          onToggleEdges={handleToggleEdges}
          onToggleBBoxCorners={handleToggleBBoxCorners}
          onToggleBBoxCenter={handleToggleBBoxCenter}
          onToggleIntersections={handleToggleIntersections}
        />

        {/* Info about coordinates */}
        {startPoint && endPoint && (
          <>
            <HStack justify="space-between">
              <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
                From:
              </Text>
              <Text fontSize="11px" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                ({formatDistance(startPoint.x, units || 'px', precision)}, {formatDistance(startPoint.y, units || 'px', precision)})
              </Text>
            </HStack>

            <HStack justify="space-between">
              <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
                To:
              </Text>
              <Text fontSize="11px" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                ({formatDistance(endPoint.x, units || 'px', precision)}, {formatDistance(endPoint.y, units || 'px', precision)})
              </Text>
            </HStack>
          </>
        )}

        {/* Distance */}
        <HStack justify="space-between">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            Distance:
          </Text>
          <Text fontSize="11px" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
            {formatDistance(distance || 0, units || 'px', precision)}
          </Text>
        </HStack>

        {/* Delta X */}
        <HStack justify="space-between">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            ΔX:
          </Text>
          <Text fontSize="11px" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
            {formatDistance(Math.abs(deltaX || 0), units || 'px', precision)}
          </Text>
        </HStack>

        {/* Delta Y */}
        <HStack justify="space-between">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            ΔY:
          </Text>
          <Text fontSize="11px" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
            {formatDistance(Math.abs(deltaY || 0), units || 'px', precision)}
          </Text>
        </HStack>

        {/* Angle */}
        <HStack justify="space-between">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            Angle:
          </Text>
          <Text fontSize="11px" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
            {formatAngle(angle || 0, precision)}
          </Text>
        </HStack>

      </VStack>
    </Panel>
  );
};
