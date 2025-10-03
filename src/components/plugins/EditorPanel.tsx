import React, { useState, useEffect, useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
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
  Input
} from '@chakra-ui/react';
import { SliderControl } from '../ui/SliderControl';
import { PresetButton } from '../ui/PresetButton';
import { LinecapSelector } from '../ui/LinecapSelector';
import { LinejoinSelector } from '../ui/LinejoinSelector';
import { FillRuleSelector } from '../ui/FillRuleSelector';
import { DashArrayCustomInput, DashArrayPresets } from '../ui/DashArraySelector';
import { PRESETS, type Preset } from '../../utils/presets';
import { useSelectedPathProperty } from '../../utils/pathPropertyUtils';

// Custom hook to subscribe to temporal state changes
const useTemporalState = () => {
  const [temporalState, setTemporalState] = useState(() => useCanvasStore.temporal.getState());

  useEffect(() => {
    const unsubscribe = useCanvasStore.temporal.subscribe(setTemporalState);
    return unsubscribe;
  }, []);

  return temporalState;
};

export const EditorPanel: React.FC = () => {
  // Use specific selectors instead of destructuring the entire store
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedCommands = useCanvasStore(state => state.selectedCommands);
  const deleteSelectedElements = useCanvasStore(state => state.deleteSelectedElements);
  const deleteSelectedCommands = useCanvasStore(state => state.deleteSelectedCommands);
  const viewport = useCanvasStore(state => state.viewport);
  const zoom = useCanvasStore(state => state.zoom);
  const resetZoom = useCanvasStore(state => state.resetZoom);
  const pencil = useCanvasStore(state => state.pencil);
  const updatePencilState = useCanvasStore(state => state.updatePencilState);
  const getSelectedPathsCount = useCanvasStore(state => state.getSelectedPathsCount);
  const updateSelectedPaths = useCanvasStore(state => state.updateSelectedPaths);
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const deleteSelectedSubpaths = useCanvasStore(state => state.deleteSelectedSubpaths);
  const getSelectedSubpathsCount = useCanvasStore(state => state.getSelectedSubpathsCount);
  const elements = useCanvasStore(state => state.elements);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);

  const { undo, redo, pastStates, futureStates } = useTemporalState();

  // Memoize computed values to prevent unnecessary re-renders
  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);
  const selectedCommandsCount = useMemo(() => selectedCommands.length, [selectedCommands]);
  const canUndo = useMemo(() => pastStates.length > 0, [pastStates.length]);
  const canRedo = useMemo(() => futureStates.length > 0, [futureStates.length]);
  const selectedPathsCount = useMemo(() => getSelectedPathsCount(), [selectedIds, elements]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedSubpathsCount = useMemo(() => getSelectedSubpathsCount(), [selectedSubpaths]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomFactor = 1.2;

  // Handle delete action based on active plugin
  const handleDelete = () => {
    if (activePlugin === 'edit' && selectedCommandsCount > 0) {
      deleteSelectedCommands();
    } else if (activePlugin === 'subpath' && selectedSubpathsCount > 0) {
      deleteSelectedSubpaths();
    } else if (activePlugin === 'select' && selectedCount > 0) {
      deleteSelectedElements();
    }
  };

  // Determine if delete button should be enabled
  const canDelete = useMemo(() => 
    (activePlugin === 'edit' && selectedCommandsCount > 0) ||
    (activePlugin === 'select' && selectedCount > 0) ||
    (activePlugin === 'subpath' && selectedSubpathsCount > 0),
    [activePlugin, selectedCommandsCount, selectedCount, selectedSubpathsCount]
  );

  // Pencil properties handlers
  const handleStrokeWidthChange = (value: number) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeWidth: value });
    } else {
      updatePencilState({ strokeWidth: value });
    }
  };

  const handleStrokeColorChange = (value: string) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeColor: value });
    } else {
      updatePencilState({ strokeColor: value });
    }
  };

  const handleStrokeNone = () => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeColor: 'none' });
    } else {
      updatePencilState({ strokeColor: 'none' });
    }
  };

  const handleOpacityChange = (value: number) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeOpacity: value });
    } else {
      updatePencilState({ strokeOpacity: value });
    }
  };

  const handleFillColorChange = (value: string) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ fillColor: value });
    } else {
      updatePencilState({ fillColor: value });
    }
  };

  const handleFillNone = () => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ fillColor: 'none' });
    } else {
      updatePencilState({ fillColor: 'none' });
    }
  };

  const handleFillOpacityChange = (value: number) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ fillOpacity: value });
    } else {
      updatePencilState({ fillOpacity: value });
    }
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
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeLinecap: value });
    } else {
      updatePencilState({ strokeLinecap: value });
    }
  };

  const handleStrokeLinejoinChange = (value: 'miter' | 'round' | 'bevel') => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeLinejoin: value });
    } else {
      updatePencilState({ strokeLinejoin: value });
    }
  };

  const handleFillRuleChange = (value: 'nonzero' | 'evenodd') => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ fillRule: value });
    } else {
      updatePencilState({ fillRule: value });
    }
  };

  const handleStrokeDasharrayChange = (value: string) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeDasharray: value });
    } else {
      updatePencilState({ strokeDasharray: value });
    }
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

  const { isOpen: isColorControlsOpen, onToggle: onColorControlsToggle } = useDisclosure({ defaultIsOpen: false });
  const { isOpen: isAdvancedStrokeOpen, onToggle: onAdvancedStrokeToggle } = useDisclosure({ defaultIsOpen: false });

  return (
    <Box bg="white" px={2} pb={2}>
      {/* Main toolbar with essential buttons */}
      <HStack justify="space-between" spacing={2} mb={1} mt={1}>
        {/* Undo/Redo Group */}
        <HStack spacing={0.5}>
          <ChakraIconButton
            aria-label="Undo"
            icon={
              <HStack spacing={0.5}>
                <Undo2 size={14} />
                <Text fontSize="10px" lineHeight="10px" minW="20px" textAlign="right">
                  {pastStates.length}
                </Text>
              </HStack>
            }
            onClick={() => undo()}
            isDisabled={!canUndo}
            colorScheme={canUndo ? 'blue' : 'gray'}
            variant={canUndo ? 'solid' : 'outline'}
            size="xs"
            h="24px"
            minW="24px"
          />
          <ChakraIconButton
            aria-label="Redo"
            icon={
              <HStack spacing={0.5}>
                <Redo2 size={14} />
                <Text fontSize="10px" lineHeight="10px" minW="20px" textAlign="right">
                  {futureStates.length}
                </Text>
              </HStack>
            }
            onClick={() => redo()}
            isDisabled={!canRedo}
            colorScheme={canRedo ? 'blue' : 'gray'}
            variant={canRedo ? 'solid' : 'outline'}
            size="xs"
            h="24px"
            minW="24px"
          />
        </HStack>

        {/* Zoom Controls Group */}
        <HStack spacing={0.5}>
          <ChakraIconButton
            aria-label="Zoom Out"
            icon={<ZoomOut size={14} />}
            onClick={() => zoom(1 / zoomFactor, window.innerWidth / 2, window.innerHeight / 2)}
            size="xs"
            h="24px"
            minW="24px"
          />
          <ChakraIconButton
            aria-label="Reset Zoom"
            icon={
              <Text fontSize="10px" lineHeight="10px" minW="32px" textAlign="center">
                {Math.round((viewport.zoom as number) * 100)}%
              </Text>
            }
            onClick={resetZoom}
            size="xs"
            h="24px"
            minW="24px"
          />
          <ChakraIconButton
            aria-label="Zoom In"
            icon={<ZoomIn size={14} />}
            onClick={() => zoom(zoomFactor, window.innerWidth / 2, window.innerHeight / 2)}
            size="xs"
            h="24px"
            minW="24px"
          />
        </HStack>

        {/* Delete Button */}
        <ChakraIconButton
          aria-label={
            activePlugin === 'edit' ? "Delete Selected Points" :
              activePlugin === 'subpath' ? "Delete Selected Subpaths" :
                "Delete Selected"
          }
          icon={
            <HStack spacing={0.5}>
              <Text fontSize="10px" lineHeight="10px" minW="20px" textAlign="left">
                {selectedCount}
              </Text>
              <Trash2 size={14} />
            </HStack>
          }
          onClick={handleDelete}
          isDisabled={!canDelete}
          colorScheme={canDelete ? 'red' : 'gray'}
          variant={canDelete ? 'solid' : 'outline'}
          size="xs"
          h="24px"
          minW="24px"
        />
      </HStack>

      {/* Pencil Properties Section */}
      <VStack spacing={1} align="stretch">
        {/* Color Presets */}
        <HStack justify="center" minH="24px" mt={1}>
          <Box
            display="grid"
            gridTemplateColumns="repeat(10, 1fr)"
            gap={0.75}
            maxW="230px"
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
            icon={isColorControlsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            onClick={onColorControlsToggle}
            size="xs"
            h="20px"
            minW="20px"
            ml={2}
          />
        </HStack>

        {/* Color Controls */}
        <Collapse in={isColorControlsOpen} animateOpacity>
          <VStack spacing={1} align="stretch">
            {/* Fill Color & Opacity */}
            <HStack justify="flex-start" minH="24px" spacing={2}>
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
              <Box minW="120px">
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
                  valueWidth="35px"
                  inline={true}
                  gap="4px"
                />
              </Box>
            </HStack>

            {/* Stroke Color & Opacity */}
            <HStack justify="flex-start" minH="24px" spacing={2}>
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
              <Box minW="120px">
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
                  valueWidth="35px"
                  inline={true}
                  gap="4px"
                />
              </Box>
            </HStack>

            {/* Stroke Width */}
            <HStack minH="24px" justify="flex-start">
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
                icon={isAdvancedStrokeOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                onClick={onAdvancedStrokeToggle}
                size="xs"
                h="20px"
                minW="20px"
                ml={2}
              />
            </HStack>

            {/* Advanced Stroke Properties */}
            <Collapse in={isAdvancedStrokeOpen} animateOpacity>
              <VStack spacing={1} align="stretch">
                {/* Advanced Properties - C, J and R in one line */}
                <HStack justify="space-between" minH="24px">
                  <HStack spacing={1}>
                    <Text fontSize="13px" fontWeight="500" color="gray.600" minW="12px" h="24px" display="flex" alignItems="center" title="Stroke Linecap">
                      C:
                    </Text>
                    <LinecapSelector
                      value={currentStrokeLinecap || 'round'}
                      onChange={handleStrokeLinecapChange}
                      title="Stroke Linecap"
                    />
                  </HStack>
                  
                  <HStack spacing={1}>
                    <Text fontSize="13px" fontWeight="500" color="gray.600" minW="12px" h="24px" display="flex" alignItems="center" title="Stroke Linejoin">
                      J:
                    </Text>
                    <LinejoinSelector
                      value={currentStrokeLinejoin || 'round'}
                      onChange={handleStrokeLinejoinChange}
                      title="Stroke Linejoin"
                    />
                  </HStack>

                  <HStack spacing={1}>
                    <Text fontSize="13px" fontWeight="500" color="gray.600" minW="12px" h="24px" display="flex" alignItems="center" title="Fill Rule">
                      R:
                    </Text>
                    <FillRuleSelector
                      value={currentFillRule || 'nonzero'}
                      onChange={handleFillRuleChange}
                      title="Fill Rule"
                    />
                  </HStack>
                </HStack>

                {/* Dash Array Presets and Custom Input in one line */}
                <HStack justify="space-between" minH="24px" spacing={2}>
                  <DashArrayPresets
                    value={currentStrokeDasharray || 'none'}
                    onChange={handleStrokeDasharrayChange}
                  />
                  
                  <HStack spacing={1}>
                    <Text fontSize="13px" fontWeight="500" color="gray.600" minW="12px" h="24px" display="flex" alignItems="center" title="Custom Dash Array">
                      D:
                    </Text>
                    <Box w="80px">
                      <DashArrayCustomInput
                        value={currentStrokeDasharray || 'none'}
                        onChange={handleStrokeDasharrayChange}
                        title="Custom dash array (e.g., 5,3,2,3)"
                      />
                    </Box>
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
