import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Input,
  IconButton as ChakraIconButton,
  NumberInput,
  NumberInputField,
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Type, Bold, Italic } from 'lucide-react';
import { getAvailableFonts } from '../../utils';
import { FontSelector } from '../ui/FontSelector';
import { Panel } from '../ui/Panel';
import { logger } from '../../utils';

export const TextPanel: React.FC = () => {
  const { text, updateTextState } = useCanvasStore();

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
    updateTextState({ fontSize: value });
  };

  const handleFontFamilyChange = (value: string) => {
    updateTextState({ fontFamily: value });
  };

  const handleFontWeightChange = (value: 'normal' | 'bold') => {
    updateTextState({ fontWeight: value });
  };

  const handleFontStyleChange = (value: 'normal' | 'italic') => {
    updateTextState({ fontStyle: value });
  };

  const handleTextChange = (value: string) => {
    updateTextState({ text: value });
  };

  // Get current values from plugin defaults
  const getCurrentFontSize = () => {
    return text.fontSize;
  };

  const getCurrentFontFamily = () => {
    return text.fontFamily;
  };

  const getCurrentText = () => {
    return text.text;
  };

  const getCurrentFontWeight = () => {
    return text.fontWeight;
  };

  const getCurrentFontStyle = () => {
    return text.fontStyle;
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
            width="60px"
          >
            <NumberInputField
              onKeyDown={(e) => {
                if (e.code === 'Space') {
                  e.stopPropagation();
                }
              }}
            />
          </NumberInput>
          
          <ChakraIconButton
            aria-label="Bold"
            icon={<Bold size={12} />}
            onClick={() => handleFontWeightChange(getCurrentFontWeight() === 'bold' ? 'normal' : 'bold')}
            isActive={getCurrentFontWeight() === 'bold'}
            colorScheme={getCurrentFontWeight() === 'bold' ? 'brand' : 'gray'}
            size="sm"
            variant={getCurrentFontWeight() === 'bold' ? 'solid' : 'ghost'}
            bg={getCurrentFontWeight() === 'bold' ? '#007bff' : 'transparent'}
          />
          
          <ChakraIconButton
            aria-label="Italic"
            icon={<Italic size={12} />}
            onClick={() => handleFontStyleChange(getCurrentFontStyle() === 'italic' ? 'normal' : 'italic')}
            isActive={getCurrentFontStyle() === 'italic'}
            colorScheme={getCurrentFontStyle() === 'italic' ? 'brand' : 'gray'}
            size="sm"
            variant={getCurrentFontStyle() === 'italic' ? 'solid' : 'ghost'}
            bg={getCurrentFontStyle() === 'italic' ? '#007bff' : 'transparent'}
          />
        </HStack>
      </VStack>
    </Panel>
  );
}