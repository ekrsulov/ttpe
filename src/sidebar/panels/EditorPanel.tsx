import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  X,
  ChevronDown,
  ChevronUp,
  Pipette
} from 'lucide-react';
import {
  VStack,
  HStack,
  IconButton as ChakraIconButton,
  Text,
  Box,
  Collapse,
  Input,
  useBreakpointValue,
  useColorMode
} from '@chakra-ui/react';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { SliderControl } from '../../ui/SliderControl';
import { PercentSliderControl } from '../../ui/PercentSliderControl';
import { PresetButton } from '../../ui/FillAndStrokePresetButton';
import { LinecapSelector } from '../../ui/LinecapSelector';
import { LinejoinSelector } from '../../ui/LinejoinSelector';
import { FillRuleSelector } from '../../ui/FillRuleSelector';
import { DashArrayCustomInput, DashArrayPresets } from '../../ui/DashArraySelector';
import { getFillAndStrokePresets, type Preset } from '../../utils/fillAndStrokePresets';
import { useSelectedPathProperty } from '../../utils/pathPropertyUtils';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';

export const EditorPanel: React.FC = () => {
  // Use specific selectors instead of destructuring the entire store
  const pencil = useCanvasStore(state => state.pencil);
  const updatePencilState = useCanvasStore(state => state.updatePencilState);
  const updateSelectedPaths = useCanvasStore(state => state.updateSelectedPaths);
  const styleEyedropper = useCanvasStore(state => state.styleEyedropper);
  const activateStyleEyedropper = useCanvasStore(state => state.activateStyleEyedropper);
  const deactivateStyleEyedropper = useCanvasStore(state => state.deactivateStyleEyedropper);
  const defaultStrokeColor = useCanvasStore(state => state.settings.defaultStrokeColor);
  const { colorMode } = useColorMode();
  const presets = React.useMemo(() => getFillAndStrokePresets(colorMode), [colorMode]);
  
  // Calculate selected paths count - only re-renders if the count changes (not when positions change)
  const selectedPathsCount = useCanvasStore(state => {
    return state.elements.filter(el => state.selectedIds.includes(el.id) && el.type === 'path').length;
  });

  // Handler for style eyedropper button
  const handleStyleEyedropper = () => {
    if (styleEyedropper.isActive) {
      deactivateStyleEyedropper();
    } else if (selectedPathsCount === 1) {
      activateStyleEyedropper();
    }
  };

  // Helper to update selected paths or fall back to pencil defaults
  const updatePathProperty = <T,>(property: string, value: T) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths?.({ [property]: value });
    } else {
      updatePencilState?.({ [property]: value });
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
      updateSelectedPaths?.({
        strokeWidth: preset.strokeWidth,
        strokeColor: preset.strokeColor,
        strokeOpacity: preset.strokeOpacity,
        fillColor: preset.fillColor,
        fillOpacity: preset.fillOpacity
      });
    } else {
      updatePencilState?.({
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
  const currentStrokeWidth = useSelectedPathProperty('strokeWidth', pencil?.strokeWidth ?? 4);
  const currentStrokeColor = useSelectedPathProperty('strokeColor', pencil?.strokeColor ?? defaultStrokeColor);
  const currentOpacity = useSelectedPathProperty('strokeOpacity', pencil?.strokeOpacity ?? 1);
  const currentFillColor = useSelectedPathProperty('fillColor', pencil?.fillColor ?? 'none');
  const currentFillOpacity = useSelectedPathProperty('fillOpacity', pencil?.fillOpacity ?? 1);
  const currentStrokeLinecap = useSelectedPathProperty('strokeLinecap', pencil?.strokeLinecap ?? 'round');
  const currentStrokeLinejoin = useSelectedPathProperty('strokeLinejoin', pencil?.strokeLinejoin ?? 'round');
  const currentFillRule = useSelectedPathProperty('fillRule', pencil?.fillRule ?? 'nonzero');
  const currentStrokeDasharray = useSelectedPathProperty('strokeDasharray', pencil?.strokeDasharray ?? 'none');

  const isColorControlsOpen = useCanvasStore((state) => state.editorColorControlsOpen);
  const setIsColorControlsOpen = useCanvasStore((state) => state.setEditorColorControlsOpen);
  const isAdvancedStrokeOpen = useCanvasStore((state) => state.editorAdvancedStrokeOpen);
  const setIsAdvancedStrokeOpen = useCanvasStore((state) => state.setEditorAdvancedStrokeOpen);

  const onColorControlsToggle = () => setIsColorControlsOpen(!isColorControlsOpen);
  const onAdvancedStrokeToggle = () => setIsAdvancedStrokeOpen(!isAdvancedStrokeOpen);

  // Responsive columns for preset grid
  const presetColumns = Math.min(presets.length, useBreakpointValue({ base: 8, md: 10 }) || 10);

  return (
    <Box bg="white" pb={1} mt={1} position="relative">
      <RenderCountBadgeWrapper componentName="EditorPanel" position="top-right" />
      {/* Pencil Properties Section */}
      <VStack spacing={1} align="stretch">
        {/* Color Presets */}
        <HStack minH="24px">
          {/* Style Eyedropper Button */}
          <ConditionalTooltip label={selectedPathsCount !== 1 ? 'Select exactly one path to copy its style' : styleEyedropper.isActive ? 'Click on another path to apply style' : 'Copy style from selected path'}>
            <ChakraIconButton
              aria-label={styleEyedropper.isActive ? "Cancel Style Copy" : "Copy Style"}
              icon={<Pipette size={16} />}
              onClick={handleStyleEyedropper}
              variant="ghost"
              size="xs"
              h="20px"
              minW="20px"
              flexShrink={0}
              bg="transparent"
              isDisabled={!styleEyedropper.isActive && selectedPathsCount !== 1}
              colorScheme={styleEyedropper.isActive ? 'blue' : 'gray'}
            />
          </ConditionalTooltip>
          <Box
            display="flex"
            justifyContent="center"
            flex={1}
          >
            <Box
              display="grid"
              gridTemplateColumns={`repeat(${presetColumns}, 1fr)`}
              gap={1}
            >
              {presets.map((preset) => (
                <PresetButton
                  key={preset.id}
                  preset={preset}
                  onClick={handlePresetSelect}
                />
              ))}
            </Box>
          </Box>
          <ConditionalTooltip label={isColorControlsOpen ? "Collapse Color Controls" : "Expand Color Controls"}>
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
          </ConditionalTooltip>
        </HStack>

        {/* Color Controls */}
        <Collapse in={isColorControlsOpen} animateOpacity>
          <VStack spacing={1} align="stretch">
            {/* Fill Color & Opacity */}
            <VStack spacing={1} align="stretch">
              <HStack justify="flex-start" minH="24px" spacing={1.5}>
                <Text fontSize="11px" fontWeight="600" color="gray.600" minW="40px" h="24px" display="flex" alignItems="center">
                  Fill
                </Text>
                <HStack spacing={1} flexShrink={0}>
                  <ConditionalTooltip label="Select fill color">
                    <Input
                      type="color"
                      value={currentFillColor === 'none' ? defaultStrokeColor : currentFillColor}
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
                  </ConditionalTooltip>
                  <ConditionalTooltip label="Set fill color to none (transparent)">
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
                  </ConditionalTooltip>
                </HStack>
                <Box flex={1} minW="120px">
                  <PercentSliderControl
                    value={currentFillOpacity}
                    onChange={handleFillOpacityChange}
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
                <Text fontSize="11px" fontWeight="600" color="gray.600" minW="40px" h="24px" display="flex" alignItems="center">
                  Stroke
                </Text>
                <HStack spacing={1} flexShrink={0}>
                  <ConditionalTooltip label="Select stroke color">
                    <Input
                      type="color"
                      value={currentStrokeColor === 'none' ? defaultStrokeColor : currentStrokeColor}
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
                    />
                  </ConditionalTooltip>
                  <ConditionalTooltip label="Set stroke color to none (no outline)">
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
                  </ConditionalTooltip>
                </HStack>
                <Box flex={1} minW="120px">
                  <PercentSliderControl
                    value={currentOpacity}
                    onChange={handleOpacityChange}
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
              <Text fontSize="11px" fontWeight="600" color="gray.600" minW="40px" h="24px" display="flex" alignItems="center">
                Width
              </Text>
              <Box flex={1}>
                <SliderControl
                  value={currentStrokeWidth}
                  min={0}
                  max={20}
                  onChange={handleStrokeWidthChange}
                  formatter={(value) => `${value}px`}
                  title="Stroke Width"
                  inline={true}
                />
              </Box>
              <ConditionalTooltip label={isAdvancedStrokeOpen ? "Collapse Advanced Stroke" : "Expand Advanced Stroke"}>
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
              </ConditionalTooltip>
            </HStack>

            {/* Advanced Stroke Properties */}
            <Collapse in={isAdvancedStrokeOpen} animateOpacity>
              <VStack spacing={1} align="stretch">
                {/* Dash Array Presets */}
                <HStack justify="flex-start" minH="24px" spacing={1}>
                  <DashArrayPresets
                    value={currentStrokeDasharray || 'none'}
                    onChange={handleStrokeDasharrayChange}
                  />
                </HStack>

                {/* Custom Dash Array */}
                <HStack justify="flex-start" minH="24px" spacing={1}>
                  <Text fontSize="11px" fontWeight="600" color="gray.600" minW="80px" h="24px" display="flex" alignItems="center" title="Custom Dash Array">
                    Dash Array
                  </Text>
                  <Box flex={1}>
                    <DashArrayCustomInput
                      value={currentStrokeDasharray || 'none'}
                      onChange={handleStrokeDasharrayChange}
                      title="Custom dash array (e.g., 5,3,2,3)"
                    />
                  </Box>
                </HStack>

                {/* Linecap */}
                <HStack justify="flex-start" minH="24px" spacing={1}>
                  <Text fontSize="11px" fontWeight="600" color="gray.600" minW="80px" h="24px" display="flex" alignItems="center" title="Stroke Linecap">
                    Line Cap
                  </Text>
                  <LinecapSelector
                    value={currentStrokeLinecap || 'round'}
                    onChange={handleStrokeLinecapChange}
                    title="Stroke Linecap"
                  />
                </HStack>

                {/* Linejoin */}
                <HStack justify="flex-start" minH="24px" spacing={1}>
                  <Text fontSize="11px" fontWeight="600" color="gray.600" minW="80px" h="24px" display="flex" alignItems="center" title="Stroke Linejoin">
                    Line Join
                  </Text>
                  <LinejoinSelector
                    value={currentStrokeLinejoin || 'round'}
                    onChange={handleStrokeLinejoinChange}
                    title="Stroke Linejoin"
                  />
                </HStack>

                {/* Fill Rule */}
                <HStack justify="flex-start" minH="24px" spacing={1}>
                  <Text fontSize="11px" fontWeight="600" color="gray.600" minW="80px" h="24px" display="flex" alignItems="center" title="Fill Rule">
                    Fill Rule
                  </Text>
                  <FillRuleSelector
                    value={currentFillRule || 'nonzero'}
                    onChange={handleFillRuleChange}
                    title="Fill Rule"
                  />
                </HStack>
              </VStack>
            </Collapse>
          </VStack>
        </Collapse>
      </VStack>

    </Box>
  );
};
