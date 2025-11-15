import React from 'react';
import { VStack, Box } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelToggleGroup } from '../../ui/PanelToggleGroup';
import { SliderControl } from '../../ui/SliderControl';
import { usePanelToggleHandlers } from '../../hooks/usePanelToggleHandlers';

const ObjectSnapPanelComponent: React.FC = () => {
  // Subscribe to objectSnap state
  const objectSnap = useCanvasStore(state => state.objectSnap);
  const updateObjectSnapState = useCanvasStore(state => state.updateObjectSnapState);

  // Use shared hook for toggle handlers
  const { createToggleHandler } = usePanelToggleHandlers(updateObjectSnapState ?? (() => {}));
  const handleToggleObjectSnap = createToggleHandler('enabled');
  const handleToggleEndpoints = createToggleHandler('snapToEndpoints');
  const handleToggleMidpoints = createToggleHandler('snapToMidpoints');
  const handleToggleIntersections = createToggleHandler('snapToIntersections');

  const isEnabled = objectSnap?.enabled ?? false;

  return (
    <Panel title="Object Snap">
      <VStack spacing={2} align="stretch">
        {/* Enable/Disable Object Snap Toggle */}
        <PanelToggle
          isChecked={isEnabled}
          onChange={handleToggleObjectSnap}
        >
          Enable OSNAP
        </PanelToggle>
        
        {/* Snap Type Toggles (single row) */}
        {isEnabled && (
          <PanelToggleGroup
            toggles={[
              {
                label: 'End',
                isChecked: objectSnap?.snapToEndpoints ?? true,
                onChange: handleToggleEndpoints,
              },
              {
                label: 'Mid',
                isChecked: objectSnap?.snapToMidpoints ?? true,
                onChange: handleToggleMidpoints,
              },
              {
                label: 'Inter',
                isChecked: objectSnap?.snapToIntersections ?? false,
                onChange: handleToggleIntersections,
              },
            ]}
            spacing={3}
          />
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
              valueWidth="35px"
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
