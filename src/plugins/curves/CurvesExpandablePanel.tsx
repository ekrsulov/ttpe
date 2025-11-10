import React from 'react';
import { VStack, HStack, Box, Text, useColorModeValue } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { useCanvasCurves } from './useCanvasCurves';

export const CurvesExpandablePanel: React.FC = () => {
  const curveState = useCanvasStore(state => state.curveState);
  const { deleteSelectedPoint, selectCurvePoint, finishPath, cancelCurve } = useCanvasCurves();
  
  const helpBoxBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  const helpTextColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const iconColor = useColorModeValue('gray.600', 'gray.300');
  
  const pointsCount = curveState?.points.length ?? 0;
  const selectedPointId = curveState?.selectedPointId;
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
    <VStack spacing={2} align="stretch" w="full">
      {/* Help box when no points */}
      {pointsCount === 0 && (
        <Box 
          bg={helpBoxBg}
          p={2} 
          borderRadius="md"
          border="1px solid"
          borderColor={borderColor}
        >
          <Text fontSize="11px" color={iconColor} fontWeight="medium" mb={1}>
            How to use:
          </Text>
          <VStack align="stretch" spacing={0.5}>
            <Text fontSize="10px" color={helpTextColor}>
              • Click to add points
            </Text>
            <Text fontSize="10px" color={helpTextColor}>
              • Drag handles to adjust curves
            </Text>
            <Text fontSize="10px" color={helpTextColor}>
              • Click first point to close path
            </Text>
            <Text fontSize="10px" color={helpTextColor}>
              • Press Enter or Finish when done
            </Text>
          </VStack>
        </Box>
      )}
      
      {selectedPointId && (
        <HStack spacing={1}>
          <PanelStyledButton
            onClick={handleDeleteSelectedPoint}
            size="sm"
            flex={1}
            fontSize="11px"
          >
            Delete
          </PanelStyledButton>
          <PanelStyledButton
            onClick={handleDeselectPoint}
            size="sm"
            flex={1}
            fontSize="11px"
          >
            Deselect
          </PanelStyledButton>
        </HStack>
      )}
      {pointsCount > 0 && (
        <HStack spacing={1}>
          <PanelStyledButton
            onClick={handleFinishCurve}
            size="sm"
            isDisabled={!canFinishCurve}
            flex={1}
            fontSize="11px"
          >
            Finish
          </PanelStyledButton>
          <PanelStyledButton
            onClick={handleCancelCurve}
            size="sm"
            flex={1}
            fontSize="11px"
          >
            Cancel
          </PanelStyledButton>
        </HStack>
      )}
    </VStack>
  );
};
