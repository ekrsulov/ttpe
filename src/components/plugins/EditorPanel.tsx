import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  Pen,
  Eye,
  Circle,
  PaintBucket,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  VStack,
  HStack,
  IconButton as ChakraIconButton,
  Text,
  Box,
  Collapse,
  useDisclosure,
  Input,
  useBreakpointValue
} from '@chakra-ui/react';
import { SliderControl } from '../ui/SliderControl';
import { PresetButton } from '../ui/PresetButton';
import { LinecapSelector } from '../ui/LinecapSelector';
import { LinejoinSelector } from '../ui/LinejoinSelector';
import { FillRuleSelector } from '../ui/FillRuleSelector';
import { DashArrayCustomInput, DashArrayPresets } from '../ui/DashArraySelector';
import { PRESETS, type Preset } from '../../utils/presets';
import { useSelectedPathProperty } from '../../utils/pathPropertyUtils';
import { RenderCountBadgeWrapper } from '../ui/RenderCountBadgeWrapper';

export const EditorPanel: React.FC = () => {
  // Use specific selectors instead of destructuring the entire store
  const pencil = useCanvasStore(state => state.pencil);
  const updatePencilState = useCanvasStore(state => state.updatePencilState);
  const updateSelectedPaths = useCanvasStore(state => state.updateSelectedPaths);
  
  // Calculate selected paths count - only re-renders if the count changes (not when positions change)
  const selectedPathsCount = useCanvasStore(state => {
    return state.elements.filter(el => state.selectedIds.includes(el.id) && el.type === 'path').length;
  });

  // Helper to update selected paths or fall back to pencil defaults
  const updatePathProperty = <T,>(property: string, value: T) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ [property]: value });
    } else {
      updatePencilState({ [property]: value });
    }
  };

  // Pencil properties handlers
  const handleStrokeWidthChange = (value: number) => {
    updatePathProperty('strokeWidth', value);
  };

  const handleStrokeColorChange = (value: string) => {
    updatePathProperty('strokeColor', value);
  };

  const handleStrokeNone = () => {
    updatePathProperty('strokeColor', 'none');
  };

  const handleOpacityChange = (value: number) => {
    updatePathProperty('strokeOpacity', value);
  };

  const handleFillColorChange = (value: string) => {
    updatePathProperty('fillColor', value);
  };

  const handleFillNone = () => {
    updatePathProperty('fillColor', 'none');
  };

  const handleFillOpacityChange = (value: number) => {
    updatePathProperty('fillOpacity', value);
  };

  const handlePresetSelect = (preset: Preset) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({
        strokeWidth: preset.strokeWidth,
        strokeColor: preset.strokeColor,
        strokeOpacity: preset.strokeOpacity,
        fillColor: preset.fillColor,
        fillOpacity: preset.fillOpacity
      });
    } else {
      updatePencilState({
        strokeWidth: preset.strokeWidth,
        strokeColor: preset.strokeColor,
        strokeOpacity: preset.strokeOpacity,
        fillColor: preset.fillColor,
        fillOpacity: preset.fillOpacity
      });
    }
  };

  // Handlers for new stroke properties
  const handleStrokeLinecapChange = (value: 'butt' | 'round' | 'square') => {
    updatePathProperty('strokeLinecap', value);
  };

  const handleStrokeLinejoinChange = (value: 'miter' | 'round' | 'bevel') => {
    updatePathProperty('strokeLinejoin', value);
  };

  const handleFillRuleChange = (value: 'nonzero' | 'evenodd') => {
    updatePathProperty('fillRule', value);
  };

  const handleStrokeDasharrayChange = (value: string) => {
    updatePathProperty('strokeDasharray', value);
  };

  // Get current values from selected elements or plugin defaults
  const currentStrokeWidth = useSelectedPathProperty('strokeWidth', pencil.strokeWidth);
  const currentStrokeColor = useSelectedPathProperty('strokeColor', pencil.strokeColor);
  const currentOpacity = useSelectedPathProperty('strokeOpacity', pencil.strokeOpacity);
  const currentFillColor = useSelectedPathProperty('fillColor', pencil.fillColor);
  const currentFillOpacity = useSelectedPathProperty('fillOpacity', pencil.fillOpacity);
  const currentStrokeLinecap = useSelectedPathProperty('strokeLinecap', pencil.strokeLinecap);
  const currentStrokeLinejoin = useSelectedPathProperty('strokeLinejoin', pencil.strokeLinejoin);
  const currentFillRule = useSelectedPathProperty('fillRule', pencil.fillRule);
  const currentStrokeDasharray = useSelectedPathProperty('strokeDasharray', pencil.strokeDasharray);

  const { isOpen: isColorControlsOpen, onToggle: onColorControlsToggle } = useDisclosure({ defaultIsOpen: true });
  const { isOpen: isAdvancedStrokeOpen, onToggle: onAdvancedStrokeToggle } = useDisclosure({ defaultIsOpen: false });

  // Responsive columns for preset grid
  const presetColumns = useBreakpointValue({ base: 8, md: 10 }) || 10;
  const presetMaxWidth = useBreakpointValue({ base: '180px', md: '230px' }) || '230px';

  return (
    <Box bg="white" pb={1} mt={1} position="relative">
      <RenderCountBadgeWrapper componentName="EditorPanel" position="top-right" />
      {/* Pencil Properties Section */}
      <VStack spacing={1} align="stretch">
        {/* Color Presets */}
        <HStack justify="space-between" minH="24px">
          <Box
            display="grid"
            gridTemplateColumns={`repeat(${presetColumns}, 1fr)`}
            gap={1.5}
            maxW={presetMaxWidth}
            flex={1}
          >
            {PRESETS.map((preset) => (
              <PresetButton
                key={preset.id}
                preset={preset}
                onClick={handlePresetSelect}
              />
            ))}
          </Box>
          <ChakraIconButton
            aria-label={isColorControlsOpen ? "Collapse Color Controls" : "Expand Color Controls"}
            icon={isColorControlsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            onClick={onColorControlsToggle}
            variant="ghost"
            size="xs"
            h="20px"
            minW="20px"
            flexShrink={0}
            bg="transparent"
          />
        </HStack>

        {/* Color Controls */}
        <Collapse in={isColorControlsOpen} animateOpacity>
          <VStack spacing={1} align="stretch">
            {/* Fill Color & Opacity */}
            <VStack spacing={1} align="stretch">
              <HStack justify="flex-start" minH="24px" spacing={1.5}>
                <PaintBucket size={14} color="#666" style={{ flexShrink: 0 }} />
                <HStack spacing={1} flexShrink={0}>
                  <Input
                    type="color"
                    value={currentFillColor === 'none' ? '#000000' : currentFillColor}
                    onChange={(e) => handleFillColorChange(e.target.value)}
                    w="20px"
                    h="20px"
                    minW="20px"
                    p={0}
                    border="1px solid"
                    borderColor="gray.300"
                    borderRadius="3px"
                    cursor="pointer"
                    opacity={currentFillColor === 'none' ? 0.5 : 1}
                    title="Fill Color"
                  />
                  <ChakraIconButton
                    aria-label="No Fill"
                    icon={<X size={12} />}
                    onClick={handleFillNone}
                    colorScheme={currentFillColor === 'none' ? 'blue' : 'gray'}
                    variant={currentFillColor === 'none' ? 'solid' : 'outline'}
                    size="xs"
                    h="20px"
                    minW="20px"
                  />
                </HStack>
                <Box flex={1} minW="120px">
                  <SliderControl
                    icon={<Eye size={14} />}
                    value={currentFillOpacity}
                    min={0}
                    max={1}
                    step={0.1}
                    onChange={handleFillOpacityChange}
                    formatter={(value) => `${Math.round(value * 100)}%`}
                    title="Fill Opacity"
                    minWidth="50px"
                    valueWidth="40px"
                    inline={true}
                    gap="4px"
                  />
                </Box>
              </HStack>
            </VStack>

            {/* Stroke Color & Opacity */}
            <VStack spacing={1} align="stretch">
              <HStack justify="flex-start" minH="24px" spacing={1.5}>
                <Pen size={14} color="#666" style={{ flexShrink: 0 }} />
                <HStack spacing={1} flexShrink={0}>
                  <Input
                    type="color"
                    value={currentStrokeColor === 'none' ? '#000000' : currentStrokeColor}
                    onChange={(e) => handleStrokeColorChange(e.target.value)}
                    w="20px"
                    h="20px"
                    minW="20px"
                    p={0}
                    border="1px solid"
                    borderColor="gray.300"
                    borderRadius="3px"
                    cursor="pointer"
                    opacity={currentStrokeColor === 'none' ? 0.5 : 1}
                    title="Stroke Color"
                  />
                  <ChakraIconButton
                    aria-label="No Stroke"
                    icon={<X size={12} />}
                    onClick={handleStrokeNone}
                    isDisabled={currentFillColor === 'none'}
                    colorScheme={currentStrokeColor === 'none' ? 'blue' : 'gray'}
                    variant={currentStrokeColor === 'none' ? 'solid' : 'outline'}
                    size="xs"
                    h="20px"
                    minW="20px"
                  />
                </HStack>
                <Box flex={1} minW="120px">
                  <SliderControl
                    icon={<Eye size={14} />}
                    value={currentOpacity}
                    min={0}
                    max={1}
                    step={0.1}
                    onChange={handleOpacityChange}
                    formatter={(value) => `${Math.round(value * 100)}%`}
                    title="Stroke Opacity"
                    minWidth="50px"
                    valueWidth="40px"
                    inline={true}
                    gap="4px"
                  />
                </Box>
              </HStack>
            </VStack>

            {/* Stroke Width */}
            <HStack minH="24px" justify="flex-start" spacing={1.5}>
              <Box flex={1}>
                <SliderControl
                  icon={<Circle size={14} />}
                  value={currentStrokeWidth}
                  min={0}
                  max={20}
                  onChange={handleStrokeWidthChange}
                  formatter={(value) => `${value}px`}
                  title="Stroke Width"
                  inline={true}
                />
              </Box>
              <ChakraIconButton
                aria-label={isAdvancedStrokeOpen ? "Collapse Advanced Stroke" : "Expand Advanced Stroke"}
                icon={isAdvancedStrokeOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                onClick={onAdvancedStrokeToggle}
                variant="ghost"
                size="xs"
                h="20px"
                minW="20px"
                flexShrink={0}
                bg="transparent"
              />
            </HStack>

            {/* Advanced Stroke Properties */}
            <Collapse in={isAdvancedStrokeOpen} animateOpacity>
              <VStack spacing={1} align="stretch">
                {/* Linecap and Linejoin - C and J in one line */}
                <HStack justify="space-between" minH="24px" spacing={1}>
                  <HStack spacing={1} flex={1}>
                    <Text fontSize="11px" fontWeight="600" color="gray.600" minW="10px" h="24px" display="flex" alignItems="center" title="Stroke Linecap">
                      C:
                    </Text>
                    <LinecapSelector
                      value={currentStrokeLinecap || 'round'}
                      onChange={handleStrokeLinecapChange}
                      title="Stroke Linecap"
                    />
                  </HStack>
                  
                  <HStack spacing={1} flex={1}>
                    <Text fontSize="11px" fontWeight="600" color="gray.600" minW="10px" h="24px" display="flex" alignItems="center" title="Stroke Linejoin">
                      J:
                    </Text>
                    <LinejoinSelector
                      value={currentStrokeLinejoin || 'round'}
                      onChange={handleStrokeLinejoinChange}
                      title="Stroke Linejoin"
                    />
                  </HStack>
                </HStack>

                {/* Dash Array Presets */}
                <HStack justify="flex-start" minH="24px" spacing={1}>
                  <DashArrayPresets
                    value={currentStrokeDasharray || 'none'}
                    onChange={handleStrokeDasharrayChange}
                  />
                </HStack>
                
                {/* Custom Dash Array and Fill Rule - D and R in same line */}
                <HStack justify="space-between" minH="24px" spacing={2}>
                  <HStack spacing={1} flex={1}>
                    <Text fontSize="11px" fontWeight="600" color="gray.600" minW="10px" h="24px" display="flex" alignItems="center" title="Custom Dash Array">
                      D:
                    </Text>
                    <Box flex={1}>
                      <DashArrayCustomInput
                        value={currentStrokeDasharray || 'none'}
                        onChange={handleStrokeDasharrayChange}
                        title="Custom dash array (e.g., 5,3,2,3)"
                      />
                    </Box>
                  </HStack>
                  
                  <HStack spacing={1} flexShrink={0}>
                    <Text fontSize="11px" fontWeight="600" color="gray.600" minW="10px" h="24px" display="flex" alignItems="center" title="Fill Rule">
                      R:
                    </Text>
                    <FillRuleSelector
                      value={currentFillRule || 'nonzero'}
                      onChange={handleFillRuleChange}
                      title="Fill Rule"
                    />
                  </HStack>
                </HStack>
              </VStack>
            </Collapse>
          </VStack>
        </Collapse>
      </VStack>

    </Box>
  );
};
