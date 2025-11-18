import React, { useEffect, useState } from 'react';
import { VStack, Box } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelToggleGroup } from '../../ui/PanelToggleGroup';
import { SliderControl } from '../../ui/SliderControl';
import { PercentSliderControl } from '../../ui/PercentSliderControl';
import { usePanelToggleHandlers } from '../../hooks/usePanelToggleHandlers';
import useDebouncedCallback from '../../hooks/useDebouncedCallback';

const ObjectSnapPanelComponent: React.FC = () => {
  // Subscribe to objectSnap state
  const objectSnap = useCanvasStore(state => state.objectSnap);
  const updateObjectSnapState = useCanvasStore(state => state.updateObjectSnapState);

  // Use shared hook for toggle handlers
  const { createToggleHandler } = usePanelToggleHandlers(updateObjectSnapState ?? (() => {}));
  const handleToggleObjectSnap = createToggleHandler('enabled');
  const handleToggleAnchors = createToggleHandler('snapToAnchors');
  const handleToggleMidpoints = createToggleHandler('snapToMidpoints');
  const handleToggleEdges = createToggleHandler('snapToEdges');
  const handleToggleBBoxCorners = createToggleHandler('snapToBBoxCorners');
  const handleToggleBBoxCenter = createToggleHandler('snapToBBoxCenter');
  const handleToggleIntersections = createToggleHandler('snapToIntersections');
  const handleToggleShowSnapPoints = createToggleHandler('showSnapPoints');

  // Local state for opacity slider
  const [localOpacity, setLocalOpacity] = useState((objectSnap?.snapPointsOpacity ?? 50) / 100);

  useEffect(() => {
    setLocalOpacity((objectSnap?.snapPointsOpacity ?? 50) / 100);
  }, [objectSnap?.snapPointsOpacity]);

  const debouncedCommit = useDebouncedCallback((value: number) => {
    updateObjectSnapState?.({ snapPointsOpacity: Math.round(value * 100) });
  }, 200);

  const handleOpacityChange = (value: number) => {
    setLocalOpacity(value);
    debouncedCommit(value);
  };

  const isEnabled = objectSnap?.enabled ?? false;

  return (
    <Panel title="Object Snap" headerActions={<PanelSwitch isChecked={isEnabled} onChange={handleToggleObjectSnap} title="Enable OSNAP" aria-label="Enable OSNAP" />}>
      <VStack spacing={2} align="stretch">
        {/* Enable/Disable Object Snap Toggle (moved to header) */}
        
        {/* Show Snap Points Toggle (always visible) */}
        {isEnabled && (
          <PanelToggle
            isChecked={objectSnap?.showSnapPoints ?? false}
            onChange={handleToggleShowSnapPoints}
          >
            Show Snap Points
          </PanelToggle>
        )}

        {/* Opacity Slider */}
            {isEnabled && objectSnap?.showSnapPoints && (
          <>
            {/* Snap Type Toggles - First row */}
            {isEnabled && (
              <PanelToggleGroup
                toggles={[
                  {
                    label: 'Anchor',
                    isChecked: objectSnap?.snapToAnchors ?? true,
                    onChange: handleToggleAnchors,
                  },
                  {
                    label: 'Mid',
                    isChecked: objectSnap?.snapToMidpoints ?? true,
                    onChange: handleToggleMidpoints,
                  },
                  {
                    label: 'Edge',
                    isChecked: objectSnap?.snapToEdges ?? true,
                    onChange: handleToggleEdges,
                  },
                ]}
                spacing={3}
              />
            )}
            {/* Snap Type Toggles - Second row */}
            {isEnabled && (
              <PanelToggleGroup
                toggles={[
                  {
                    label: 'Corner',
                    isChecked: objectSnap?.snapToBBoxCorners ?? true,
                    onChange: handleToggleBBoxCorners,
                  },
                  {
                    label: 'Center',
                    isChecked: objectSnap?.snapToBBoxCenter ?? true,
                    onChange: handleToggleBBoxCenter,
                  },
                  {
                    label: 'Inter',
                    isChecked: objectSnap?.snapToIntersections ?? true,
                    onChange: handleToggleIntersections,
                  },
                ]}
                spacing={3}
              />
            )}
            <Box>
                <PercentSliderControl
                  label="Opacity:"
                  value={localOpacity}
                  step={0.1}
                  decimals={0}
                  onChange={handleOpacityChange}
                  labelWidth="60px"
                  valueWidth="40px"
                  marginBottom="0"
                />
              </Box>
            </>
        )}

        {/* Threshold Slider */}
        {isEnabled && (
          <Box>
            <SliderControl
              label="Threshold:"
              value={objectSnap?.snapThreshold ?? 8}
              min={4}
              max={20}
              step={1}
              onChange={(value) => updateObjectSnapState?.({ snapThreshold: value })}
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

// Export memoized version
export const ObjectSnapPanel = React.memo(ObjectSnapPanelComponent);
