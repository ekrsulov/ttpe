import React from 'react';
import {
  VStack,
  Text,
  Box,
  HStack,
  Grid,
  Collapse,
  useDisclosure,
  IconButton as ChakraIconButton
} from '@chakra-ui/react';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Optical Alignment Panel
 * 
 * Allows users to visually center a path inside another path using
 * the visual center algorithm from https://github.com/javierbyte/visual-center
 */
const OpticalAlignmentPanelComponent: React.FC = () => {
  // Subscribe to primitives only to minimize re-renders
  const opticalAlignmentResult = useCanvasStore(state => state.opticalAlignmentResult);
  const isCalculatingAlignment = useCanvasStore(state => state.isCalculatingAlignment);
  // Subscribe to selectedIds to trigger re-render when selection changes
  useCanvasStore(state => state.selectedIds);
  
  // Collapsible Advanced section state
  const { isOpen: isAdvancedOpen, onToggle: onAdvancedToggle } = useDisclosure();
  
  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV;
  
  // Get actions directly when needed (doesn't cause re-renders)
  const {
    canPerformOpticalAlignment,
    calculateOpticalAlignment,
    applyOpticalAlignment,
    clearOpticalAlignment,
    applyOpticalAlignmentToAllPairs,
    applyMathematicalAlignment,
    applyMathematicalAlignmentToAllPairs,
    selectAllContainers,
    selectAllContents,
  } = useCanvasStore.getState();

  // Calculate canAlign based on current selectedIds (will recalculate on each render)
  const canAlign = canPerformOpticalAlignment?.() ?? false;

  const handleCalculate = async () => {
    await calculateOpticalAlignment?.();
  };

  const handleApply = () => {
    applyOpticalAlignment?.();
  };

  const handleApplyDirectly = async () => {
    await calculateOpticalAlignment?.();
    // Apply immediately after calculation
    setTimeout(() => {
      applyOpticalAlignment?.();
    }, 100);
  };

  const handleClear = () => {
    clearOpticalAlignment?.();
  };

  const handleApplyToAll = async () => {
    await applyOpticalAlignmentToAllPairs?.();
  };

  const handleMathematicalAlign = () => {
    applyMathematicalAlignment?.();
  };

  const handleMathematicalAlignAll = () => {
    applyMathematicalAlignmentToAllPairs?.();
  };

  // Calculate offset from mathematical center
  const offsetFromMathCenter = opticalAlignmentResult ? {
    dx: opticalAlignmentResult.visualCenter.x - opticalAlignmentResult.mathematicalCenter.x,
    dy: opticalAlignmentResult.visualCenter.y - opticalAlignmentResult.mathematicalCenter.y
  } : null;

  return (
    <Panel title="Optical Alignment">
      <VStack align="stretch" spacing={2}>
        {/* Primary Action - Always visible */}
        <PanelStyledButton
          onClick={handleApplyDirectly}
          isDisabled={!canAlign || isCalculatingAlignment}
          isLoading={isCalculatingAlignment}
          loadingText="Applying..."
        >
          Apply Visual Center
        </PanelStyledButton>

        {/* Advanced Section - Collapsible (Development Only) */}
        {isDevelopment && (
          <Box mt={1}>
            <HStack
              justify="space-between"
              py={1}
            >
              <Text 
                color="gray.600"
                _dark={{ color: 'gray.400' }}
                cursor="pointer"
                onClick={onAdvancedToggle}
                _hover={{ color: "gray.800", _dark: { color: 'gray.200' } }}
              >
                Advanced
              </Text>
              <ConditionalTooltip label={isAdvancedOpen ? "Collapse Advanced" : "Expand Advanced"}>
                <ChakraIconButton
                  aria-label={isAdvancedOpen ? "Collapse Advanced" : "Expand Advanced"}
                  icon={isAdvancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  onClick={onAdvancedToggle}
                  variant="ghost"
                  size="xs"
                  h="20px"
                  minW="20px"
                  flexShrink={0}
                  bg="transparent"
                />
              </ConditionalTooltip>
            </HStack>

            <Collapse in={isAdvancedOpen} animateOpacity>
            <VStack spacing={3} align="stretch" mt={2}>
              {/* Visual Center Section */}
              <Box>
                <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                  Visual Center (Optical)
                </Text>
                
                <Grid templateColumns="1fr 1fr" gap={2}>
                  <PanelStyledButton
                    onClick={handleCalculate}
                    isDisabled={!canAlign || isCalculatingAlignment}
                    isLoading={isCalculatingAlignment}
                    loadingText="Calculating..."
                  >
                    Calculate
                  </PanelStyledButton>

                  <PanelStyledButton
                    onClick={handleApplyToAll}
                    isDisabled={isCalculatingAlignment}
                    isLoading={isCalculatingAlignment}
                  >
                    Apply All
                  </PanelStyledButton>
                </Grid>

                {/* Results - Between Visual Center and Mathematical Center */}
                {opticalAlignmentResult && (
                  <VStack spacing={2} align="stretch" mt={1}>
                    <Box color="gray.600" _dark={{ color: 'gray.400' }}>
                      <Text>Offset</Text>
                      
                      {/* Current position offset */}
                      <HStack justify="space-between" fontSize="10px">
                        <Text color="gray.600" _dark={{ color: 'gray.400' }}>Current:</Text>
                        <Text fontFamily="mono">
                          dx: {opticalAlignmentResult.offset.x.toFixed(2)}, 
                          dy: {opticalAlignmentResult.offset.y.toFixed(2)}
                        </Text>
                      </HStack>
                      
                      {/* Offset from mathematical center */}
                      {offsetFromMathCenter && (
                        <HStack justify="space-between" fontSize="10px">
                          <Text color="gray.600" _dark={{ color: 'gray.400' }}>From math center:</Text>
                          <Text fontFamily="mono">
                            dx: {offsetFromMathCenter.dx.toFixed(2)}, 
                            dy: {offsetFromMathCenter.dy.toFixed(2)}
                          </Text>
                        </HStack>
                      )}
                    </Box>

                    <Grid templateColumns="1fr 1fr" gap={2}>
                      <PanelStyledButton onClick={handleApply}>
                        Apply
                      </PanelStyledButton>
                      <PanelStyledButton onClick={handleClear}>
                        Cancel
                      </PanelStyledButton>
                    </Grid>
                  </VStack>
                )}
              </Box>

              {/* Mathematical Center Section */}
              <Box>
                <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                  Mathematical Center
                </Text>

                <Grid templateColumns="1fr 1fr" gap={2}>
                  <PanelStyledButton
                    onClick={handleMathematicalAlign}
                    isDisabled={!canAlign || isCalculatingAlignment}
                  >
                    Apply
                  </PanelStyledButton>

                  <PanelStyledButton
                    onClick={handleMathematicalAlignAll}
                    isDisabled={isCalculatingAlignment}
                  >
                    Apply All
                  </PanelStyledButton>
                </Grid>
              </Box>

              {/* Selection Section */}
              <Box>
                <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                  Selection
                </Text>

                <Grid templateColumns="1fr 1fr" gap={2}>
                  <PanelStyledButton onClick={selectAllContainers}>
                    Containers
                  </PanelStyledButton>

                  <PanelStyledButton onClick={selectAllContents}>
                    Contents
                  </PanelStyledButton>
                </Grid>
              </Box>
            </VStack>
          </Collapse>
        </Box>
        )}
      </VStack>
    </Panel>
  );
};

// Export memoized version - only re-renders when props change (no props = never re-renders from parent)
// Component only re-renders internally when opticalAlignmentResult or isCalculatingAlignment changes
export const OpticalAlignmentPanel = React.memo(OpticalAlignmentPanelComponent);
