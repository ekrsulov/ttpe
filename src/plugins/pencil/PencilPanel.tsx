import React from 'react';
import { VStack, HStack, Text } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { ToggleButton } from '../../ui/ToggleButton';

export const PencilPanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const pencil = useCanvasStore(state => state.pencil);
  const updatePencilState = useCanvasStore(state => state.updatePencilState);

  const handleReusePathToggle = () => {
    updatePencilState?.({ reusePath: !(pencil?.reusePath ?? false) });
  };

  return (
    <Panel title="Pencil">
      <VStack spacing={2} align="stretch">
        {/* Path Mode Selection */}
        <HStack spacing={1} justify="space-between">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>Path Mode:</Text>
          <HStack spacing={1}>
            <ToggleButton
              isActive={!(pencil?.reusePath ?? false)}
              onClick={handleReusePathToggle}
              aria-label="New Path"
              variant="text"
              size="sm"
            >
              New
            </ToggleButton>
            <ToggleButton
              isActive={(pencil?.reusePath ?? false)}
              onClick={handleReusePathToggle}
              aria-label="Add Subpath"
              variant="text"
              size="sm"
            >
              Add
            </ToggleButton>
          </HStack>
        </HStack>

        <SliderControl
          label="Tolerance:"
          value={pencil?.simplificationTolerance ?? 0}
          min={0}
          max={10}
          step={0.1}
          onChange={(value) => updatePencilState?.({ simplificationTolerance: value })}
          formatter={(value) => value.toFixed(1)}
          labelWidth="60px"
          valueWidth="35px"
          marginBottom='0'
        />
      </VStack>
    </Panel>
  );
};