import React from 'react';
import { VStack, HStack, Input, Box } from '@chakra-ui/react';
import { Bold, Italic } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { FontSelector } from '../../ui/FontSelector';
import { NumberInput } from '../../ui/NumberInput';
import { ToggleButton } from '../../ui/ToggleButton';
import { getAvailableFonts } from '../../utils';
import { preventSpacebarPropagation } from '../../utils/panelHelpers';

export const TextExpandablePanel: React.FC = () => {
  const text = useCanvasStore(state => state.text);
  const updateTextState = useCanvasStore(state => state.updateTextState);
  
  const handleFontWeightChange = (value: 'normal' | 'bold') => {
    updateTextState?.({ fontWeight: value });
  };
  
  const handleFontStyleChange = (value: 'normal' | 'italic') => {
    updateTextState?.({ fontStyle: value });
  };
  
  return (
    <Box minH="300px" w="full">
      <VStack spacing={2} align="stretch" w="full">
        <Input
          value={text?.text ?? ''}
          onChange={(e) => updateTextState?.({ text: e.target.value })}
          onKeyDown={preventSpacebarPropagation}
          placeholder="Enter text"
          size="sm"
          h="20px"
          borderRadius="0"
          _focus={{
            borderColor: 'gray.600',
            boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)'
          }}
        />
        <FontSelector
          value={text?.fontFamily ?? 'Arial'}
          onChange={(value) => updateTextState?.({ fontFamily: value })}
          fonts={getAvailableFonts()}
        />
        <HStack spacing={1}>
          <NumberInput
            label="Size"
            value={text?.fontSize ?? 180}
            onChange={(value) => updateTextState?.({ fontSize: value })}
            min={4}
            max={200}
            inputWidth="50px"
          />
          <ToggleButton
            isActive={text?.fontWeight === 'bold'}
            onClick={() => handleFontWeightChange(text?.fontWeight === 'bold' ? 'normal' : 'bold')}
            icon={<Bold size={12} />}
            aria-label="Bold"
            size="sm"
          />
          <ToggleButton
            isActive={text?.fontStyle === 'italic'}
            onClick={() => handleFontStyleChange(text?.fontStyle === 'italic' ? 'normal' : 'italic')}
            icon={<Italic size={12} />}
            aria-label="Italic"
            size="sm"
          />
        </HStack>
      </VStack>
    </Box>
  );
};
