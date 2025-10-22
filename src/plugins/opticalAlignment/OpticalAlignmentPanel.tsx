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
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../components/ui/Panel';
import { AlignmentActionButton } from '../../components/ui/AlignmentActionButton';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

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
    <Panel icon={<Sparkles size={16} />} title="Optical Alignment">
      <VStack align="stretch" spacing={2}>
        {/* Primary Action - Always visible */}
        <AlignmentActionButton
          onClick={handleApplyDirectly}
          isDisabled={!canAlign || isCalculatingAlignment}
          isLoading={isCalculatingAlignment}
          loadingText="Applying..."
        >
          Apply Visual Center
        </AlignmentActionButton>

        {/* Advanced Section - Collapsible (Development Only) */}
        {isDevelopment && (
          <Box mt={1}>
            <HStack
              justify="space-between"
              py={1}
              px={2}
            >
              <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                Advanced
              </Text>
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
            </HStack>

            <Collapse in={isAdvancedOpen} animateOpacity>
            <VStack spacing={3} align="stretch" mt={2}>
              {/* Visual Center Section */}
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color="gray.600" px={2} mb={2}>
                  Visual Center (Optical)
                </Text>
                
                <Grid templateColumns="1fr 1fr" gap={2}>
                  <AlignmentActionButton
                    onClick={handleCalculate}
                    isDisabled={!canAlign || isCalculatingAlignment}
                    isLoading={isCalculatingAlignment}
                    loadingText="Calculating..."
                  >
                    Calculate
                  </AlignmentActionButton>

                  <AlignmentActionButton
                    onClick={handleApplyToAll}
                    isDisabled={isCalculatingAlignment}
                    isLoading={isCalculatingAlignment}
                  >
                    Apply All
                  </AlignmentActionButton>
                </Grid>

                {/* Results - Between Visual Center and Mathematical Center */}
                {opticalAlignmentResult && (
                  <VStack spacing={2} align="stretch" mt={3}>
                    <Box fontSize="xs" color="gray.600">
                      <Text fontWeight="semibold" mb={1}>Offset:</Text>
                      
                      {/* Current position offset */}
                      <HStack justify="space-between" fontSize="10px">
                        <Text>Current:</Text>
                        <Text fontFamily="mono">
                          dx: {opticalAlignmentResult.offset.x.toFixed(2)}, 
                          dy: {opticalAlignmentResult.offset.y.toFixed(2)}
                        </Text>
                      </HStack>
                      
                      {/* Offset from mathematical center */}
                      {offsetFromMathCenter && (
                        <HStack justify="space-between" fontSize="10px">
                          <Text>From math center:</Text>
                          <Text fontFamily="mono">
                            dx: {offsetFromMathCenter.dx.toFixed(2)}, 
                            dy: {offsetFromMathCenter.dy.toFixed(2)}
                          </Text>
                        </HStack>
                      )}
                    </Box>

                    <Grid templateColumns="1fr 1fr" gap={2}>
                      <AlignmentActionButton onClick={handleApply}>
                        Apply
                      </AlignmentActionButton>
                      <AlignmentActionButton onClick={handleClear}>
                        Cancel
                      </AlignmentActionButton>
                    </Grid>
                  </VStack>
                )}
              </Box>

              {/* Mathematical Center Section */}
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color="gray.600" px={2} mb={2}>
                  Mathematical Center
                </Text>

                <Grid templateColumns="1fr 1fr" gap={2}>
                  <AlignmentActionButton
                    onClick={handleMathematicalAlign}
                    isDisabled={!canAlign || isCalculatingAlignment}
                  >
                    Apply
                  </AlignmentActionButton>

                  <AlignmentActionButton
                    onClick={handleMathematicalAlignAll}
                    isDisabled={isCalculatingAlignment}
                  >
                    Apply All
                  </AlignmentActionButton>
                </Grid>
              </Box>

              {/* Selection Section */}
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color="gray.600" px={2} mb={2}>
                  Selection
                </Text>

                <Grid templateColumns="1fr 1fr" gap={2}>
                  <AlignmentActionButton onClick={selectAllContainers}>
                    Containers
                  </AlignmentActionButton>

                  <AlignmentActionButton onClick={selectAllContents}>
                    Contents
                  </AlignmentActionButton>
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
