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
import { Type, Bold, Italic } from 'lucide-react';
import { getAvailableFonts } from '../../utils';
import { FontSelector } from '../../components/ui/FontSelector';
import { Panel } from '../../components/ui/Panel';
import { logger } from '../../utils';

export const TextPanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const text = useCanvasStore(state => state.text);
  const updateTextState = useCanvasStore(state => state.updateTextState);

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

  const handleFontSizeChange = (value: number) => {
    updateTextState?.({ fontSize: value });
  };

  const handleFontFamilyChange = (value: string) => {
    updateTextState?.({ fontFamily: value });
  };

  const handleFontWeightChange = (value: 'normal' | 'bold') => {
    updateTextState?.({ fontWeight: value });
  };

  const handleFontStyleChange = (value: 'normal' | 'italic') => {
    updateTextState?.({ fontStyle: value });
  };

  const handleTextChange = (value: string) => {
    updateTextState?.({ text: value });
  };

  // Get current values from plugin defaults
  const getCurrentFontSize = () => {
    return text?.fontSize ?? 16;
  };

  const getCurrentFontFamily = () => {
    return text?.fontFamily ?? 'Arial';
  };

  const getCurrentText = () => {
    return text?.text ?? '';
  };

  const getCurrentFontWeight = () => {
    return text?.fontWeight ?? 'normal';
  };

  const getCurrentFontStyle = () => {
    return text?.fontStyle ?? 'normal';
  };

  return (
    <Panel icon={<Type size={16} />} title="Text">
      <VStack spacing={2} align="stretch">
        {/* Text Input */}
        <Input
          value={getCurrentText()}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.code === 'Space') {
              e.stopPropagation();
            }
          }}
          placeholder="Enter text"
          size="sm"
        />

        {/* Font Selector */}
        <FontSelector
          value={getCurrentFontFamily()}
          onChange={handleFontFamilyChange}
          fonts={availableFonts}
          disabled={isScanningFonts}
          loading={isScanningFonts}
        />

        {/* Font Size and Style Controls */}
        <HStack spacing={1}>
          <NumberInput
            value={getCurrentFontSize()}
            onChange={(_, valueNumber) => handleFontSizeChange(valueNumber || 12)}
            min={4}
            size="sm"
            width="100px"
          >
            <NumberInputField
              onKeyDown={(e) => {
                if (e.code === 'Space') {
                  e.stopPropagation();
                }
              }}
            />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          
          <ChakraIconButton
            aria-label="Bold"
            icon={<Bold size={12} />}
            onClick={() => handleFontWeightChange(getCurrentFontWeight() === 'bold' ? 'normal' : 'bold')}
            variant="unstyled"
            size="sm"
            bg={getCurrentFontWeight() === 'bold' ? 'blue.500' : 'transparent'}
            color={getCurrentFontWeight() === 'bold' ? 'white' : 'gray.700'}
            border="1px solid"
            borderColor={getCurrentFontWeight() === 'bold' ? 'blue.500' : 'gray.400'}
            borderRadius="md"
            fontWeight="medium"
            transition="all 0.2s"
            _hover={{
              bg: getCurrentFontWeight() === 'bold' ? 'blue.600' : 'gray.50'
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
            onClick={() => handleFontStyleChange(getCurrentFontStyle() === 'italic' ? 'normal' : 'italic')}
            variant="unstyled"
            size="sm"
            bg={getCurrentFontStyle() === 'italic' ? 'blue.500' : 'transparent'}
            color={getCurrentFontStyle() === 'italic' ? 'white' : 'gray.700'}
            border="1px solid"
            borderColor={getCurrentFontStyle() === 'italic' ? 'blue.500' : 'gray.400'}
            borderRadius="md"
            fontWeight="medium"
            transition="all 0.2s"
            _hover={{
              bg: getCurrentFontStyle() === 'italic' ? 'blue.600' : 'gray.50'
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