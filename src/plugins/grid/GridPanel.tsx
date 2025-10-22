import React from 'react';
import { VStack } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Grid3X3 } from 'lucide-react';
import { Panel } from '../../components/ui/Panel';
import { PanelToggleGroup } from '../../components/ui/PanelToggleGroup';
import { SliderControl } from '../../components/ui/SliderControl';
import { usePanelToggleHandlers } from '../../hooks/usePanelToggleHandlers';

const GridPanelComponent: React.FC = () => {
  // Only subscribe to grid state
  const grid = useCanvasStore(state => state.grid);
  const updateGridState = useCanvasStore(state => state.updateGridState);

  // Use shared hook for toggle handlers
  const { createToggleHandler } = usePanelToggleHandlers(updateGridState ?? (() => {}));
  const handleToggleGrid = createToggleHandler('enabled');
  const handleToggleSnap = createToggleHandler('snapEnabled');
  const handleToggleRulers = createToggleHandler('showRulers');

  const handleSpacingChange = (value: number) => {
    updateGridState?.({ spacing: value });
  };

  return (
    <Panel icon={<Grid3X3 size={16} />} title="Grid">
      <VStack spacing={2} align="stretch">
        {/* Grid toggles on one line */}
        <PanelToggleGroup
          toggles={[
            {
              label: 'Show',
              isChecked: grid?.enabled ?? false,
              onChange: handleToggleGrid,
            },
            {
              label: 'Snap',
              isChecked: grid?.snapEnabled ?? false,
              onChange: handleToggleSnap,
              isDisabled: !(grid?.enabled ?? false),
            },
            {
              label: 'Rulers',
              isChecked: grid?.showRulers ?? false,
              onChange: handleToggleRulers,
              isDisabled: !(grid?.enabled ?? false),
            },
          ]}
        />

        {/* Grid Spacing Slider */}
        <SliderControl
          label="Spacing"
          value={grid?.spacing ?? 20}
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