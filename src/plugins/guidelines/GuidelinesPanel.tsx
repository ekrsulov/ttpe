import React from 'react';
import { VStack } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggleGroup } from '../../ui/PanelToggleGroup';
import { usePanelToggleHandlers } from '../../hooks/usePanelToggleHandlers';

const GuidelinesPanelComponent: React.FC = () => {
  // Only subscribe to guidelines state
  const guidelines = useCanvasStore(state => state.guidelines);
  const updateGuidelinesState = useCanvasStore(state => state.updateGuidelinesState);

  // Use shared hook for toggle handlers
  const { createToggleHandler } = usePanelToggleHandlers(updateGuidelinesState ?? (() => {}));
  const handleToggleGuidelines = createToggleHandler('enabled');
  const handleToggleDistanceGuidelines = createToggleHandler('distanceEnabled');
  const handleToggleDebugMode = createToggleHandler('debugMode');

  return (
    <Panel title="Guidelines" headerActions={<PanelSwitch isChecked={guidelines?.enabled ?? false} onChange={handleToggleGuidelines} title="Enable Guidelines" aria-label="Enable Guidelines" />}>
      {/* Only render the rest of the panel when guidelines are enabled */}
      {guidelines?.enabled ? (
        <VStack spacing={2} align="stretch">
          {/* Distance and Debug Toggles on the same line */}
          <PanelToggleGroup
            toggles={[
              {
                label: 'Distance',
                isChecked: guidelines?.distanceEnabled ?? false,
                onChange: handleToggleDistanceGuidelines,
              },
              ...(import.meta.env.DEV
                ? [
                    {
                      label: 'Debug',
                      isChecked: guidelines?.debugMode ?? false,
                      onChange: handleToggleDebugMode,
                    },
                  ]
                : []),
            ]}
            spacing={3}
          />
        </VStack>
      ) : null}
    </Panel>
  );
};

// Export memoized version
export const GuidelinesPanel = React.memo(GuidelinesPanelComponent);
