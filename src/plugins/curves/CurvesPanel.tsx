import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  useBreakpointValue,
} from '@chakra-ui/react';
import { 
  TrendingUp,
} from 'lucide-react';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { useCanvasStore } from '../../store/canvasStore';
import { useCanvasCurves } from './useCanvasCurves';

const CurvesPanelComponent: React.FC = () => {
  // Only subscribe to activePlugin to control visibility
  const activePlugin = useCanvasStore(state => state.activePlugin);
  
  // Get curves functionality from hook
  const { curveState, selectCurvePoint, deleteSelectedPoint, finishPath, cancelCurve } = useCanvasCurves();
  
  // Subscribe to primitives only to minimize re-renders
  const pointsCount = curveState?.points.length ?? 0;
  const selectedPointId = curveState?.selectedPointId;

  // Call hooks before any early returns
  const isMobile = useBreakpointValue({ base: true, md: false }, { fallback: 'md' });

  if (activePlugin !== 'curves') return null;

  const hasPoints = pointsCount > 0;
  const hasSelectedPoint = selectedPointId !== undefined;
  const selectedPoint = (curveState?.points ?? []).find(p => p.id === selectedPointId);
  const canFinishCurve = pointsCount >= 2;

  const handleDeleteSelectedPoint = () => {
    deleteSelectedPoint();
  };

  const handleDeselectPoint = () => {
    selectCurvePoint(undefined);
  };

  const handleFinishCurve = () => {
    finishPath();
  };

  const handleCancelCurve = () => {
    cancelCurve();
  };

  return (
    <Panel title="Curves">
      <VStack spacing={3} align="stretch">
        {/* Selected Point Section */}
        {hasSelectedPoint && selectedPoint && (
          <Box>
            <Text fontSize="12px" fontWeight="semibold" color="gray.900" _dark={{ color: 'gray.100' }}>
              Selected Point
            </Text>

            {/* Point Coordinates */}
            <Box 
              p={2} 
              borderRadius="md" 
              fontSize="11px"
            >
              <HStack spacing={4} justify="space-between">
                <HStack spacing={1}>
                  <Text color="gray.600" _dark={{ color: 'gray.400' }} fontWeight="medium">X:</Text>
                  <Text fontFamily="mono">{selectedPoint.x.toFixed(2)}</Text>
                </HStack>
                <HStack spacing={1}>
                  <Text color="gray.600" _dark={{ color: 'gray.400' }} fontWeight="medium">Y:</Text>
                  <Text fontFamily="mono">{selectedPoint.y.toFixed(2)}</Text>
                </HStack>
              </HStack>
              
              {/* Show handle info if point has handles */}
              {selectedPoint.handleIn && (
                <HStack spacing={1} mt={1}>
                  <Box color="gray.600" _dark={{ color: 'gray.400' }}>
                    <TrendingUp size={10} />
                  </Box>
                  <Text color="gray.600" _dark={{ color: 'gray.400' }} fontWeight="medium">In:</Text>
                  <Text fontFamily="mono">
                    ({selectedPoint.handleIn.x.toFixed(1)}, {selectedPoint.handleIn.y.toFixed(1)})
                  </Text>
                </HStack>
              )}
              {selectedPoint.handleOut && (
                <HStack spacing={1} mt={1}>
                  <Box color="gray.600" _dark={{ color: 'gray.400' }}>
                    <TrendingUp size={10} style={{ transform: 'rotate(180deg)' }} />
                  </Box>
                  <Text color="gray.600" _dark={{ color: 'gray.400' }} fontWeight="medium">Out:</Text>
                  <Text fontFamily="mono">
                    ({selectedPoint.handleOut.x.toFixed(1)}, {selectedPoint.handleOut.y.toFixed(1)})
                  </Text>
                </HStack>
              )}
            </Box>

            {/* Point Actions */}
            <HStack spacing={2} mt={2}>
              <PanelStyledButton
                onClick={handleDeleteSelectedPoint}
                size="sm"
                flex={1}
                fontSize="12px"
              >
                Delete
              </PanelStyledButton>
              <PanelStyledButton
                onClick={handleDeselectPoint}
                size="sm"
                flex={1}
                fontSize="12px"
              >
                Deselect
              </PanelStyledButton>
            </HStack>
          </Box>
        )}

        {/* Instructions Section */}
        {!hasPoints && (
          <Box 
            bg="yellow.50"
            p={2} 
            borderRadius="md"
            border="1px solid"
            borderColor="yellow.300"
          >
            <Text fontSize="11px" color="gray.700" fontWeight="medium" mb={1}>
              How to use:
            </Text>
            <VStack align="stretch" spacing={0.5}>
              <Text fontSize="10px" color="gray.600">
                • Click to add points
              </Text>
              <Text fontSize="10px" color="gray.600">
                • Drag handles to adjust curves
              </Text>
              <Text fontSize="10px" color="gray.600">
                • Click first point to close path
              </Text>
              <Text fontSize="10px" color="gray.600">
                • Press Enter or Finish when done
              </Text>
            </VStack>
          </Box>
        )}

        {/* Keyboard Shortcuts */}
        {hasPoints && !isMobile && (
          <Box 
            bg="yellow.50"
            p={2} 
            borderRadius="md"
            border="1px solid"
            borderColor="yellow.300"
          >
            <Text fontSize="11px" color="gray.700" fontWeight="medium" mb={1}>
              Keyboard Shortcuts:
            </Text>
            <VStack align="stretch" spacing={0.5}>
              <HStack justify="space-between">
                <Text fontSize="10px" color="gray.600">Enter</Text>
                <Text fontSize="10px" color="gray.700">Finish curve</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="10px" color="gray.600">Escape</Text>
                <Text fontSize="10px" color="gray.700">Cancel curve</Text>
              </HStack>
              {hasSelectedPoint && (
                <HStack justify="space-between">
                  <Text fontSize="10px" color="gray.600">Delete</Text>
                  <Text fontSize="10px" color="gray.700">Delete point</Text>
                </HStack>
              )}
            </VStack>
          </Box>
        )}

        {/* Finish and Cancel Buttons */}
        {hasPoints && (
          <HStack spacing={2}>
            <PanelStyledButton
              onClick={handleFinishCurve}
              size="sm"
              isDisabled={!canFinishCurve}
              flex={1}
              fontSize="12px"
            >
              Finish
            </PanelStyledButton>
            <PanelStyledButton
              onClick={handleCancelCurve}
              size="sm"
              flex={1}
              fontSize="12px"
            >
              Cancel
            </PanelStyledButton>
          </HStack>
        )}
      </VStack>
    </Panel>
  );
};

// Export memoized version - only re-renders when props change (no props = never re-renders from parent)
// Component only re-renders internally when activePlugin, pointsCount, selectedPointId, or curves settings change
export const CurvesPanel = React.memo(CurvesPanelComponent);
