import React, { useEffect, useRef, useState } from 'react';
import { VStack, HStack, Tag, Text, Box } from '@chakra-ui/react';
import { Lock, LockOpen } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../components/ui/Panel';
import { PanelToggle } from '../../components/ui/PanelToggle';
import { NumberInput } from '../../components/ui/NumberInput';
import { usePanelToggleHandlers } from '../../hooks/usePanelToggleHandlers';

export const TransformationPanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const elements = useCanvasStore(state => state.elements); // Subscribe to elements for canvas changes
  const transformation = useCanvasStore(state => state.transformation);
  const updateTransformationState = useCanvasStore(state => state.updateTransformationState);
  const isWorkingWithSubpaths = useCanvasStore(state => state.isWorkingWithSubpaths);
  const getTransformationBounds = useCanvasStore(state => state.getTransformationBounds);
  const applyResizeTransform = useCanvasStore(state => state.applyResizeTransform);
  const applyRotationTransform = useCanvasStore(state => state.applyRotationTransform);
  
  const { createToggleHandler } = usePanelToggleHandlers(updateTransformationState ?? (() => {}));
  
  const { showCoordinates, showRulers, maintainAspectRatio } = transformation ?? { 
    showCoordinates: false, 
    showRulers: false,
    maintainAspectRatio: true
  };

  const isSubpathMode = isWorkingWithSubpaths?.() ?? false;
  const selectedCount = isSubpathMode ? (selectedSubpaths?.length ?? 0) : selectedIds.length;

  // Get current bounds for transformation and store in state to trigger re-renders
  const [currentBounds, setCurrentBounds] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  
  // Update bounds whenever selection changes or when forced
  const [updateTrigger, setUpdateTrigger] = useState(0);
  
  useEffect(() => {
    const bounds = getTransformationBounds?.();
    setCurrentBounds(bounds ?? null);
  }, [selectedIds, selectedSubpaths, getTransformationBounds, updateTrigger, elements]);

  const width = currentBounds ? Math.round(currentBounds.maxX - currentBounds.minX) : 0;
  const height = currentBounds ? Math.round(currentBounds.maxY - currentBounds.minY) : 0;

  // Track the aspect ratio
  const aspectRatioRef = useRef(1);
  
  // Update aspect ratio when selection changes
  useEffect(() => {
    if (currentBounds && width > 0 && height > 0) {
      aspectRatioRef.current = width / height;
    }
  }, [selectedIds, selectedSubpaths, currentBounds?.minX, currentBounds?.minY, currentBounds?.maxX, currentBounds?.maxY, currentBounds, width, height]);

  const handleWidthChange = (newWidth: number) => {
    if (applyResizeTransform) {
      const currentBounds = getTransformationBounds?.();
      if (currentBounds) {
        let newHeight = currentBounds.maxY - currentBounds.minY;
        
        if (maintainAspectRatio && aspectRatioRef.current > 0) {
          newHeight = newWidth / aspectRatioRef.current;
        }
        
        applyResizeTransform(newWidth, newHeight);
        // Trigger bounds update
        setUpdateTrigger(prev => prev + 1);
      }
    }
  };

  const handleHeightChange = (newHeight: number) => {
    if (applyResizeTransform) {
      const currentBounds = getTransformationBounds?.();
      if (currentBounds) {
        let newWidth = currentBounds.maxX - currentBounds.minX;
        
        if (maintainAspectRatio && aspectRatioRef.current > 0) {
          newWidth = newHeight * aspectRatioRef.current;
        }
        
        applyResizeTransform(newWidth, newHeight);
        // Trigger bounds update
        setUpdateTrigger(prev => prev + 1);
      }
    }
  };

  const handleRotationChange = (degrees: number) => {
    if (degrees !== 0 && applyRotationTransform) {
      applyRotationTransform(degrees);
      // Trigger bounds update
      setUpdateTrigger(prev => prev + 1);
    }
  };

  return (
    <Panel 
      title="Transform"
      headerActions={isSubpathMode && (
        <Tag size="sm" colorScheme="purple" fontSize="xs">
          Subpath
        </Tag>
      )}
    >
      <VStack spacing={3} align="stretch">
        {/* Toggles at the top */}
        <HStack spacing={3}>
          <PanelToggle
            isChecked={showCoordinates}
            onChange={createToggleHandler('showCoordinates')}
          >
            Coords
          </PanelToggle>

          <PanelToggle
            isChecked={showRulers}
            onChange={createToggleHandler('showRulers')}
          >
            Rulers
          </PanelToggle>
        </HStack>

        {selectedCount === 0 && (
          <Text fontSize="xs" color="gray.500">
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
                      w="40px"
                      h="1px"
                      bg={maintainAspectRatio ? 'rgb(49, 130, 206)' : 'gray.300'}
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
                      w="40px"
                      h="1px"
                      bg={maintainAspectRatio ? 'rgb(49, 130, 206)' : 'gray.300'}
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
                    top="3"
                    bottom="3"
                    w="1px" 
                    bg={maintainAspectRatio ? 'rgb(49, 130, 206)' : 'gray.300'}
                    transition="background 0.2s"
                  />
                  
                  {/* Lock button */}
                  <Box
                    as="button"
                    onClick={() => updateTransformationState?.({ maintainAspectRatio: !maintainAspectRatio })}
                    p={0.5}
                    borderRadius="3px"
                    bg={maintainAspectRatio ? 'rgb(219, 234, 254)' : 'white'}
                    color={maintainAspectRatio ? 'rgb(49, 130, 206)' : 'gray.400'}
                    border="1px solid"
                    borderColor={maintainAspectRatio ? 'rgb(49, 130, 206)' : 'gray.300'}
                    _hover={{ 
                      bg: maintainAspectRatio ? 'rgb(191, 219, 254)' : 'rgb(247, 250, 252)',
                      borderColor: maintainAspectRatio ? 'rgb(66, 153, 225)' : 'gray.400'
                    }}
                    transition="all 0.2s"
                    title={maintainAspectRatio ? 'Locked - Proportional resize' : 'Unlocked - Free resize'}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    minW="20px"
                    h="20px"
                    position="relative"
                    zIndex={1}
                  >
                    {maintainAspectRatio ? <Lock size={11} /> : <LockOpen size={11} />}
                  </Box>
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
    </Panel>
  );
};