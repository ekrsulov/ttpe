import React from 'react';
import { VStack } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Ruler } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { PanelToggleGroup } from '../ui/PanelToggleGroup';
import { PanelToggle } from '../ui/PanelToggle';
import { usePanelToggleHandlers } from '../../hooks/usePanelToggleHandlers';

const GuidelinesPanelComponent: React.FC = () => {
  // Only subscribe to guidelines state
  const guidelines = useCanvasStore(state => state.guidelines);
  const updateGuidelinesState = useCanvasStore(state => state.updateGuidelinesState);

  // Use shared hook for toggle handlers
  const { createToggleHandler } = usePanelToggleHandlers(updateGuidelinesState);
  const handleToggleGuidelines = createToggleHandler('enabled');
  const handleToggleDistanceGuidelines = createToggleHandler('distanceEnabled');
  const handleToggleDebugMode = createToggleHandler('debugMode');

  return (
    <Panel 
      icon={<Ruler size={16} />} 
      title="Guidelines"
    >
      <VStack spacing={2} align="stretch">
        {/* Alignment and Distance Guidelines Toggles on one line */}
        <PanelToggleGroup
          toggles={[
            {
              label: 'Alignment',
              isChecked: guidelines.enabled,
              onChange: handleToggleGuidelines,
            },
            {
              label: 'Distance',
              isChecked: guidelines.distanceEnabled,
              onChange: handleToggleDistanceGuidelines,
              isDisabled: !guidelines.enabled,
            },
          ]}
        />

        {/* Debug Mode Toggle - Only in development */}
        {import.meta.env.DEV && (
          <PanelToggle
            isChecked={guidelines.debugMode || false}
            onChange={handleToggleDebugMode}
            isDisabled={!guidelines.enabled}
            accentColor="orange"
          >
            Debug (show all)
          </PanelToggle>
        )}
      </VStack>
    </Panel>
  );
};

// Export memoized version
export const GuidelinesPanel = React.memo(GuidelinesPanelComponent);
