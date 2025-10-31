import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Bold, Italic } from 'lucide-react';
import { getAvailableFonts } from '../../utils';
import { FontSelector } from '../../ui/FontSelector';
import { ToggleButton } from '../../ui/ToggleButton';
import { Panel } from '../../ui/Panel';
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
          
          <ToggleButton
            isActive={current.fontWeight === 'bold'}
            onClick={() => handleFontWeightChange(current.fontWeight === 'bold' ? 'normal' : 'bold')}
            icon={<Bold size={12} />}
            aria-label="Bold"
            size="lg"
          />
          
          <ToggleButton
            isActive={current.fontStyle === 'italic'}
            onClick={() => handleFontStyleChange(current.fontStyle === 'italic' ? 'normal' : 'italic')}
            icon={<Italic size={12} />}
            aria-label="Italic"
            size="lg"
          />
        </HStack>
      </VStack>
    </Panel>
  );
}