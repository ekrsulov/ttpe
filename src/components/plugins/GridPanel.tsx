import React from 'react';
import { VStack } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Grid3X3 } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { PanelToggle } from '../ui/PanelToggle';
import { SliderControl } from '../ui/SliderControl';

const GridPanelComponent: React.FC = () => {
  // Only subscribe to grid state
  const grid = useCanvasStore(state => state.grid);
  const updateGridState = useCanvasStore(state => state.updateGridState);

  const handleToggleGrid = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateGridState({ enabled: e.target.checked });
  };

  const handleToggleSnap = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateGridState({ snapEnabled: e.target.checked });
  };

  const handleToggleRulers = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateGridState({ showRulers: e.target.checked });
  };

  const handleSpacingChange = (value: number) => {
    updateGridState({ spacing: value });
  };

  return (
    <Panel icon={<Grid3X3 size={16} />} title="Grid">
      <VStack spacing={2} align="stretch">
        {/* Show Grid Toggle */}
        <PanelToggle
          isChecked={grid.enabled}
          onChange={handleToggleGrid}
        >
          Show Grid
        </PanelToggle>

        {/* Snap to Grid Toggle */}
        <PanelToggle
          isChecked={grid.snapEnabled}
          onChange={handleToggleSnap}
          isDisabled={!grid.enabled}
        >
          Snap to Grid
        </PanelToggle>

        {/* Show Rulers Toggle */}
        <PanelToggle
          isChecked={grid.showRulers}
          onChange={handleToggleRulers}
          isDisabled={!grid.enabled}
        >
          Show Rulers
        </PanelToggle>

        {/* Grid Spacing Slider */}
        <SliderControl
          label="Spacing"
          value={grid.spacing}
          min={5}
          max={100}
          step={5}
          onChange={handleSpacingChange}
          formatter={(value) => `${value}px`}
          title="Grid spacing in pixels"
        />
      </VStack>
    </Panel>
  );
};

export default GridPanelComponent;