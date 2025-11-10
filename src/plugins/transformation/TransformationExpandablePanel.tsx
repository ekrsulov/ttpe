import React from 'react';
import { VStack, HStack, Box, Text } from '@chakra-ui/react';
import { Lock, LockOpen } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { PanelToggle } from '../../ui/PanelToggle';
import { NumberInput } from '../../ui/NumberInput';
import ConditionalTooltip from '../../ui/ConditionalTooltip';

export const TransformationExpandablePanel: React.FC = () => {
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const transformation = useCanvasStore(state => state.transformation);
  const updateTransformationState = useCanvasStore(state => state.updateTransformationState);
  const isWorkingWithSubpaths = useCanvasStore(state => state.isWorkingWithSubpaths);
  const getTransformationBounds = useCanvasStore(state => state.getTransformationBounds);
  const applyResizeTransform = useCanvasStore(state => state.applyResizeTransform);
  const applyRotationTransform = useCanvasStore(state => state.applyRotationTransform);
  
  // Get transformation bounds and dimensions
  const currentBounds = getTransformationBounds?.();
  const width = currentBounds ? Math.round(currentBounds.maxX - currentBounds.minX) : 0;
  const height = currentBounds ? Math.round(currentBounds.maxY - currentBounds.minY) : 0;
  
  // Track aspect ratio
  const aspectRatio = width > 0 && height > 0 ? width / height : 1;
  
  const { showCoordinates, showRulers, maintainAspectRatio } = transformation ?? { 
    showCoordinates: false, 
    showRulers: false,
    maintainAspectRatio: true
  };
  
  const isSubpathMode = isWorkingWithSubpaths?.() ?? false;
  const selectedCount = isSubpathMode ? (selectedSubpaths?.length ?? 0) : selectedIds.length;
  
  const handleWidthChange = (newWidth: number) => {
    if (applyResizeTransform && currentBounds) {
      let newHeight = currentBounds.maxY - currentBounds.minY;
      
      if (maintainAspectRatio && aspectRatio > 0) {
        newHeight = newWidth / aspectRatio;
      }
      
      applyResizeTransform(newWidth, newHeight);
    }
  };
  
  const handleHeightChange = (newHeight: number) => {
    if (applyResizeTransform && currentBounds) {
      let newWidth = currentBounds.maxX - currentBounds.minX;
      
      if (maintainAspectRatio && aspectRatio > 0) {
        newWidth = newHeight * aspectRatio;
      }
      
      applyResizeTransform(newWidth, newHeight);
    }
  };
  
  const handleRotationChange = (degrees: number) => {
    if (degrees !== 0 && applyRotationTransform) {
      applyRotationTransform(degrees);
    }
  };
  
  return (
    <VStack spacing={2} align="stretch" w="full">
      {/* Toggles at the top */}
      <HStack spacing={3}>
        <PanelToggle
          isChecked={showCoordinates}
          onChange={(e) => updateTransformationState?.({ showCoordinates: e.target.checked })}
        >
          Coords
        </PanelToggle>

        <PanelToggle
          isChecked={showRulers}
          onChange={(e) => updateTransformationState?.({ showRulers: e.target.checked })}
        >
          Rulers
        </PanelToggle>
      </HStack>

      {selectedCount === 0 && (
        <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }}>
          {`Select ${isSubpathMode ? 'a subpath' : 'an element'} to transform`}
        </Text>
      )}

      {selectedCount > 0 && (
        <VStack spacing={1.5} align="stretch">
          {/* Size controls with lock */}
          <Box position="relative">
            <HStack spacing={0} align="stretch">
              <VStack spacing={1.5} align="stretch" flex={1}>
                <HStack spacing={2} position="relative">
                  <NumberInput
                    label="Width"
                    value={width}
                    onChange={handleWidthChange}
                    min={1}
                    step={1}
                    suffix="px"
                    labelWidth="50px"
                    inputWidth="65px"
                  />
                  {/* Horizontal line from Width to lock */}
                  <Box 
                    position="absolute"
                    right="-18px"
                    top="50%"
                    transform="translateY(-50%)"
                    w="25px"
                    h="2px"
                    bg={maintainAspectRatio ? 'gray.500' : 'gray.300'}
                    _dark={{
                      bg: maintainAspectRatio ? 'gray.400' : 'gray.600'
                    }}
                    transition="background 0.2s"
                  />
                </HStack>
                
                <HStack spacing={2} position="relative">
                  <NumberInput
                    label="Height"
                    value={height}
                    onChange={handleHeightChange}
                    min={1}
                    step={1}
                    suffix="px"
                    labelWidth="50px"
                    inputWidth="65px"
                  />
                  {/* Horizontal line from Height to lock */}
                  <Box 
                    position="absolute"
                    right="-18px"
                    top="50%"
                    transform="translateY(-50%)"
                    w="25px"
                    h="2px"
                    bg={maintainAspectRatio ? 'gray.500' : 'gray.300'}
                    _dark={{
                      bg: maintainAspectRatio ? 'gray.400' : 'gray.600'
                    }}
                    transition="background 0.2s"
                  />
                </HStack>
              </VStack>
              
              {/* Lock button with vertical connecting line forming a bracket ] */}
              <Box position="relative" ml="10px" display="flex" flexDirection="column" justifyContent="center">
                {/* Vertical line spanning from top to bottom */}
                <Box 
                  position="absolute"
                  left="2"
                  top="9px"
                  bottom="9px"
                  w="2px" 
                  bg={maintainAspectRatio ? 'gray.500' : 'gray.300'}
                  _dark={{
                    bg: maintainAspectRatio ? 'gray.400' : 'gray.600'
                  }}
                  transition="background 0.2s"
                />
                
                {/* Lock button */}
                <ConditionalTooltip
                  label={maintainAspectRatio ? 'Locked - Proportional resize' : 'Unlocked - Free resize'}
                  placement="top"
                >
                  <Box
                    as="button"
                    onClick={() => updateTransformationState?.({ maintainAspectRatio: !maintainAspectRatio })}
                    p={0.25}
                    borderRadius="full"
                    bg="white"
                    color={maintainAspectRatio ? 'gray.500' : 'gray.400'}
                    border="2px solid"
                    borderColor={maintainAspectRatio ? 'gray.500' : 'gray.300'}
                    _dark={{
                      bg: 'gray.700',
                      color: maintainAspectRatio ? 'gray.400' : 'gray.600',
                      borderColor: maintainAspectRatio ? 'gray.400' : 'gray.600'
                    }}
                    _hover={{ 
                      bg: 'rgb(247, 250, 252)',
                      borderColor: maintainAspectRatio ? 'gray.600' : 'gray.400',
                      _dark: {
                        bg: 'gray.600',
                        borderColor: maintainAspectRatio ? 'gray.300' : 'gray.500'
                      }
                    }}
                    transition="all 0.2s"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    minW="18px"
                    h="18px"
                    position="relative"
                    zIndex={1}
                  >
                    {maintainAspectRatio ? <Lock size={10} strokeWidth={4} /> : <LockOpen size={10} strokeWidth={4} />}
                  </Box>
                </ConditionalTooltip>
              </Box>
            </HStack>
          </Box>

          {/* Rotation control */}
          <NumberInput
            label="Rotation"
            value={0}
            onChange={handleRotationChange}
            min={0}
            max={360}
            step={1}
            suffix="deg"
            labelWidth="50px"
            inputWidth="65px"
            resetAfterChange={true}
          />
        </VStack>
      )}
    </VStack>
  );
};
