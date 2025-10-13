import React from 'react';
import { VStack, Checkbox as ChakraCheckbox } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Grid3X3 } from 'lucide-react';
import { Panel } from '../ui/Panel';
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
        <ChakraCheckbox
          isChecked={grid.enabled}
          onChange={handleToggleGrid}
          size="sm"
          sx={{
            '& .chakra-checkbox__control': {
              bg: grid.enabled ? 'blue.500' : 'transparent',
              borderColor: grid.enabled ? 'blue.500' : 'gray.400',
              _checked: {
                bg: 'blue.500',
                borderColor: 'blue.500',
                color: 'white',
                _hover: {
                  bg: 'blue.600',
                  borderColor: 'blue.600',
                }
              },
              _hover: {
                bg: grid.enabled ? 'blue.600' : 'gray.50',
                borderColor: grid.enabled ? 'blue.600' : 'gray.400',
              }
            }
          }}
        >
          Show Grid
        </ChakraCheckbox>

        {/* Snap to Grid Toggle */}
        <ChakraCheckbox
          isChecked={grid.snapEnabled}
          onChange={handleToggleSnap}
          isDisabled={!grid.enabled}
          size="sm"
          sx={{
            '& .chakra-checkbox__control': {
              bg: grid.snapEnabled ? 'blue.500' : 'transparent',
              borderColor: grid.snapEnabled ? 'blue.500' : 'gray.400',
              _checked: {
                bg: 'blue.500',
                borderColor: 'blue.500',
                color: 'white',
                _hover: {
                  bg: 'blue.600',
                  borderColor: 'blue.600',
                }
              },
              _hover: {
                bg: grid.snapEnabled ? 'blue.600' : 'gray.50',
                borderColor: grid.snapEnabled ? 'blue.600' : 'gray.400',
              },
              _disabled: {
                opacity: 0.4,
                cursor: 'not-allowed',
              }
            }
          }}
        >
          Snap to Grid
        </ChakraCheckbox>

        {/* Show Rulers Toggle */}
        <ChakraCheckbox
          isChecked={grid.showRulers}
          onChange={handleToggleRulers}
          isDisabled={!grid.enabled}
          size="sm"
          sx={{
            '& .chakra-checkbox__control': {
              bg: grid.showRulers ? 'blue.500' : 'transparent',
              borderColor: grid.showRulers ? 'blue.500' : 'gray.400',
              _checked: {
                bg: 'blue.500',
                borderColor: 'blue.500',
                color: 'white',
                _hover: {
                  bg: 'blue.600',
                  borderColor: 'blue.600',
                }
              },
              _hover: {
                bg: grid.showRulers ? 'blue.600' : 'gray.50',
                borderColor: grid.showRulers ? 'blue.600' : 'gray.400',
              },
              _disabled: {
                opacity: 0.4,
                cursor: 'not-allowed',
              }
            }
          }}
        >
          Show Rulers
        </ChakraCheckbox>

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