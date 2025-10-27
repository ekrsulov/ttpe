import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Input,
  IconButton as ChakraIconButton,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Bold, Italic } from 'lucide-react';
import { getAvailableFonts } from '../../utils';
import { FontSelector } from '../../components/ui/FontSelector';
import { Panel } from '../../components/ui/Panel';
import { logger } from '../../utils';
import { createPropertyUpdater, createPropertyGetters, preventSpacebarPropagation } from '../../utils/panelHelpers';

export const TextPanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const text = useCanvasStore(state => state.text);
  const updateTextState = useCanvasStore(state => state.updateTextState);

  // Create property updater and current values helper
  const updateProperty = createPropertyUpdater(updateTextState);
  const current = createPropertyGetters(text, {
    fontSize: 16,
    fontFamily: 'Arial',
    text: '',
    fontWeight: 'normal' as 'normal' | 'bold',
    fontStyle: 'normal' as 'normal' | 'italic'
  });

  // Font detection state
  const [availableFonts, setAvailableFonts] = useState<string[]>([]);
  const [isScanningFonts, setIsScanningFonts] = useState(true);

  // Load available fonts on component mount
  useEffect(() => {
    const loadFonts = async () => {
      setIsScanningFonts(true);
      try {
        const fonts = getAvailableFonts();
        setAvailableFonts(fonts);
      } catch (error) {
        logger.error('Error detecting fonts', error);
        // Fallback to basic fonts if detection fails
        setAvailableFonts(['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia']);
      } finally {
        setIsScanningFonts(false);
      }
    };

    loadFonts();
  }, []);

  const handleFontWeightChange = (value: 'normal' | 'bold') => {
    updateTextState?.({ fontWeight: value });
  };

  const handleFontStyleChange = (value: 'normal' | 'italic') => {
    updateTextState?.({ fontStyle: value });
  };

  return (
    <Panel title="Text">
      <VStack spacing={2} align="stretch">
        {/* Text Input */}
        <Input
          value={current.text}
          onChange={(e) => updateProperty('text')(e.target.value)}
          onKeyDown={preventSpacebarPropagation}
          placeholder="Enter text"
          size="sm"
        />

        {/* Font Selector */}
        <FontSelector
          value={current.fontFamily}
          onChange={updateProperty('fontFamily')}
          fonts={availableFonts}
          disabled={isScanningFonts}
          loading={isScanningFonts}
        />

        {/* Font Size and Style Controls */}
        <HStack spacing={1}>
          <NumberInput
            value={current.fontSize}
            onChange={(_, valueNumber) => updateProperty('fontSize')(valueNumber || 12)}
            min={4}
            size="sm"
            width="100px"
          >
            <NumberInputField
              onKeyDown={preventSpacebarPropagation}
            />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          
          <ChakraIconButton
            aria-label="Bold"
            icon={<Bold size={12} />}
            onClick={() => handleFontWeightChange(current.fontWeight === 'bold' ? 'normal' : 'bold')}
            variant="unstyled"
            size="sm"
            bg={current.fontWeight === 'bold' ? 'blue.500' : 'transparent'}
            color={current.fontWeight === 'bold' ? 'white' : 'gray.700'}
            border="1px solid"
            borderColor={current.fontWeight === 'bold' ? 'blue.500' : 'gray.400'}
            borderRadius="md"
            fontWeight="medium"
            transition="all 0.2s"
            _hover={{
              bg: current.fontWeight === 'bold' ? 'blue.600' : 'gray.50'
            }}
            sx={{
              minH: '28px',
              px: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
          
          <ChakraIconButton
            aria-label="Italic"
            icon={<Italic size={12} />}
            onClick={() => handleFontStyleChange(current.fontStyle === 'italic' ? 'normal' : 'italic')}
            variant="unstyled"
            size="sm"
            bg={current.fontStyle === 'italic' ? 'blue.500' : 'transparent'}
            color={current.fontStyle === 'italic' ? 'white' : 'gray.700'}
            border="1px solid"
            borderColor={current.fontStyle === 'italic' ? 'blue.500' : 'gray.400'}
            borderRadius="md"
            fontWeight="medium"
            transition="all 0.2s"
            _hover={{
              bg: current.fontStyle === 'italic' ? 'blue.600' : 'gray.50'
            }}
            sx={{
              minH: '28px',
              px: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </HStack>
      </VStack>
    </Panel>
  );
}