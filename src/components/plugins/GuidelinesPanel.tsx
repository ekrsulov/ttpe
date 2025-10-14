import React from 'react';
import { VStack } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Ruler } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { PanelToggle } from '../ui/PanelToggle';

const GuidelinesPanelComponent: React.FC = () => {
  // Only subscribe to guidelines state
  const guidelines = useCanvasStore(state => state.guidelines);
  const updateGuidelinesState = useCanvasStore(state => state.updateGuidelinesState);

  const handleToggleGuidelines = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateGuidelinesState({ enabled: e.target.checked });
  };

  const handleToggleDistanceGuidelines = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateGuidelinesState({ distanceEnabled: e.target.checked });
  };

  const handleToggleDebugMode = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateGuidelinesState({ debugMode: e.target.checked });
  };

  return (
    <Panel 
      icon={<Ruler size={16} />} 
      title="Guidelines"
    >
      <VStack spacing={2} align="stretch">
        {/* Alignment Guidelines Toggle */}
        <PanelToggle
          isChecked={guidelines.enabled}
          onChange={handleToggleGuidelines}
        >
          Alignment
        </PanelToggle>

        {/* Distance Guidelines Toggle */}
        <PanelToggle
          isChecked={guidelines.distanceEnabled}
          onChange={handleToggleDistanceGuidelines}
          isDisabled={!guidelines.enabled}
        >
          Distance
        </PanelToggle>

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
