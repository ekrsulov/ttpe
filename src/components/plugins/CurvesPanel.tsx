import React from 'react';
import {
  VStack,
  HStack,
  Button,
  Text,
  Checkbox as ChakraCheckbox,
  Box,
  Flex,
  Heading,
  Divider,
} from '@chakra-ui/react';
import { 
  PenTool, 
  Grid, 
  Hand,
  Check,
  X,
  Trash2,
  Circle,
  TrendingUp,
} from 'lucide-react';
import { Panel } from '../ui/Panel';
import { SliderControl } from '../ui/SliderControl';
import { useCanvasStore } from '../../store/canvasStore';

export const CurvesPanel: React.FC = () => {
  // Selectors for curves settings and actions
  const curves = useCanvasStore(state => state.curves);
  const curveState = useCanvasStore(state => state.curveState);
  const updateCurvesSettings = useCanvasStore(state => state.updateCurvesSettings);
  const selectCurvePoint = useCanvasStore(state => state.selectCurvePoint);
  const deleteCurvePoint = useCanvasStore(state => state.deleteCurvePoint);
  const updateCurvePoint = useCanvasStore(state => state.updateCurvePoint);
  const finishCurve = useCanvasStore(state => state.finishCurve);
  const cancelCurve = useCanvasStore(state => state.cancelCurve);
  const activePlugin = useCanvasStore(state => state.activePlugin);

  if (activePlugin !== 'curves') return null;

  const hasPoints = curveState.points.length > 0;
  const hasSelectedPoint = curveState.selectedPointId !== undefined;
  const selectedPoint = curveState.points.find(p => p.id === curveState.selectedPointId);
  const canFinishCurve = curveState.points.length >= 2;

  // Generic toggle handler for boolean curve settings
  const toggleCurvesSetting = (key: 'snapToGrid' | 'showHandles' | 'showPreview') => {
    updateCurvesSettings({ [key]: !curves[key] });
  };

  const handleToggleSnapToGrid = () => toggleCurvesSetting('snapToGrid');
  const handleToggleShowHandles = () => toggleCurvesSetting('showHandles');
  const handleToggleShowPreview = () => toggleCurvesSetting('showPreview');

  const handleGridSizeChange = (gridSize: number) => {
    updateCurvesSettings({ gridSize });
  };

  const handleDeleteSelectedPoint = () => {
    if (curveState.selectedPointId) {
      deleteCurvePoint(curveState.selectedPointId);
    }
  };

  const handleDeselectPoint = () => {
    selectCurvePoint(undefined);
  };

  const handleFinishCurve = () => {
    finishCurve();
  };

  const handleCancelCurve = () => {
    cancelCurve();
  };

  return (
    <Panel icon={<PenTool size={16} />} title="Curves">
      <VStack spacing={3} align="stretch">
        {/* Curve Status Section */}
        {hasPoints && (
          <Box>
            <Flex 
              align="center" 
              justify="space-between" 
              mb={2}
              bg="gray.50"
              py={1.5}
              px={2}
              borderRadius="md"
            >
              <HStack spacing={1.5}>
                <PenTool size={14} color="#666" />
                <Text fontSize="12px" fontWeight="semibold" color="gray.700">
                  Current Curve
                </Text>
              </HStack>
              <Text fontSize="11px" color="gray.500">
                {curveState.points.length} point{curveState.points.length !== 1 ? 's' : ''}
              </Text>
            </Flex>

            {/* Curve Actions */}
            <HStack spacing={2} mb={2}>
              <Button
                onClick={handleFinishCurve}
                size="sm"
                colorScheme="brand"
                leftIcon={<Check size={14} />}
                isDisabled={!canFinishCurve}
                flex={1}
                fontSize="12px"
              >
                Finish
              </Button>
              <Button
                onClick={handleCancelCurve}
                size="sm"
                variant="outline"
                colorScheme="red"
                leftIcon={<X size={14} />}
                flex={1}
                fontSize="12px"
              >
                Cancel
              </Button>
            </HStack>
          </Box>
        )}

        {/* Selected Point Section */}
        {hasSelectedPoint && selectedPoint && (
          <Box>
            <Flex 
              align="center" 
              justify="space-between" 
              mb={2}
              bg="blue.50"
              py={1.5}
              px={2}
              borderRadius="md"
            >
              <HStack spacing={1.5}>
                <Circle size={14} color="#3182CE" />
                <Text fontSize="12px" fontWeight="semibold" color="blue.700">
                  Selected Point
                </Text>
              </HStack>
              <Text fontSize="11px" color="blue.600">
                {selectedPoint.type}
              </Text>
            </Flex>

            {/* Point Actions */}
            <HStack spacing={2} mb={2}>
              <Button
                onClick={handleDeleteSelectedPoint}
                size="sm"
                variant="outline"
                colorScheme="red"
                leftIcon={<Trash2 size={14} />}
                flex={1}
                fontSize="12px"
              >
                Delete
              </Button>
              <Button
                onClick={handleDeselectPoint}
                size="sm"
                variant="outline"
                leftIcon={<Hand size={14} />}
                flex={1}
                fontSize="12px"
              >
                Deselect
              </Button>
            </HStack>

            {/* Point Type Selection */}
            <Box mb={2}>
              <Text fontSize="11px" color="gray.600" mb={1} fontWeight="medium">
                Point Type:
              </Text>
              <HStack spacing={1}>
                <Button
                  onClick={() => updateCurvePoint(selectedPoint.id, { type: 'corner' })}
                  size="xs"
                  colorScheme={selectedPoint.type === 'corner' ? 'brand' : 'gray'}
                  variant={selectedPoint.type === 'corner' ? 'solid' : 'outline'}
                  flex={1}
                  fontSize="11px"
                >
                  Corner
                </Button>
                <Button
                  onClick={() => updateCurvePoint(selectedPoint.id, { type: 'smooth' })}
                  size="xs"
                  colorScheme={selectedPoint.type === 'smooth' ? 'brand' : 'gray'}
                  variant={selectedPoint.type === 'smooth' ? 'solid' : 'outline'}
                  flex={1}
                  fontSize="11px"
                >
                  Smooth
                </Button>
                <Button
                  onClick={() => updateCurvePoint(selectedPoint.id, { type: 'asymmetric' })}
                  size="xs"
                  colorScheme={selectedPoint.type === 'asymmetric' ? 'brand' : 'gray'}
                  variant={selectedPoint.type === 'asymmetric' ? 'solid' : 'outline'}
                  flex={1}
                  fontSize="11px"
                >
                  Asymmetric
                </Button>
              </HStack>
            </Box>

            {/* Point Coordinates */}
            <Box 
              bg="gray.50" 
              p={2} 
              borderRadius="md" 
              fontSize="11px"
            >
              <HStack spacing={4} justify="space-between">
                <HStack spacing={1}>
                  <Text color="gray.600" fontWeight="medium">X:</Text>
                  <Text fontFamily="mono">{selectedPoint.x.toFixed(2)}</Text>
                </HStack>
                <HStack spacing={1}>
                  <Text color="gray.600" fontWeight="medium">Y:</Text>
                  <Text fontFamily="mono">{selectedPoint.y.toFixed(2)}</Text>
                </HStack>
              </HStack>
              
              {/* Show handle info if point has handles */}
              {selectedPoint.handleIn && (
                <HStack spacing={1} mt={1}>
                  <TrendingUp size={10} color="#666" />
                  <Text color="gray.600" fontWeight="medium">In:</Text>
                  <Text fontFamily="mono">
                    ({selectedPoint.handleIn.x.toFixed(1)}, {selectedPoint.handleIn.y.toFixed(1)})
                  </Text>
                </HStack>
              )}
              {selectedPoint.handleOut && (
                <HStack spacing={1} mt={1}>
                  <TrendingUp size={10} color="#666" style={{ transform: 'rotate(180deg)' }} />
                  <Text color="gray.600" fontWeight="medium">Out:</Text>
                  <Text fontFamily="mono">
                    ({selectedPoint.handleOut.x.toFixed(1)}, {selectedPoint.handleOut.y.toFixed(1)})
                  </Text>
                </HStack>
              )}
            </Box>
          </Box>
        )}

        {hasPoints && hasSelectedPoint && <Divider />}

        {/* Settings Section */}
        <Box>
          <Flex 
            align="center" 
            justify="space-between" 
            mb={2}
          >
            <HStack spacing={1.5}>
              <Grid size={14} color="#666" />
              <Heading size="xs" fontWeight="extrabold">Settings</Heading>
            </HStack>
          </Flex>

          {/* Snap to Grid */}
          <HStack spacing={2} mb={2} justify="space-between">
            <Text fontSize="12px" color="gray.600">Snap to Grid:</Text>
            <ChakraCheckbox
              isChecked={curves.snapToGrid}
              onChange={handleToggleSnapToGrid}
              size="sm"
              colorScheme="brand"
            />
          </HStack>

          {/* Grid Size Slider */}
          {curves.snapToGrid && (
            <SliderControl
              icon={<Grid size={14} />}
              label="Size"
              value={curves.gridSize}
              min={5}
              max={50}
              step={5}
              onChange={handleGridSizeChange}
              formatter={(value) => `${value}px`}
              marginBottom="8px"
            />
          )}

          {/* Show Handles */}
          <HStack spacing={2} mb={2} justify="space-between">
            <Text fontSize="12px" color="gray.600">Show Handles:</Text>
            <ChakraCheckbox
              isChecked={curves.showHandles}
              onChange={handleToggleShowHandles}
              size="sm"
              colorScheme="brand"
            />
          </HStack>

          {/* Show Preview */}
          <HStack spacing={2} mb={2} justify="space-between">
            <Text fontSize="12px" color="gray.600">Show Preview:</Text>
            <ChakraCheckbox
              isChecked={curves.showPreview}
              onChange={handleToggleShowPreview}
              size="sm"
              colorScheme="brand"
            />
          </HStack>
        </Box>

        {/* Instructions Section */}
        {!hasPoints && (
          <Box 
            bg="blue.50" 
            p={2} 
            borderRadius="md"
            borderLeft="3px solid"
            borderColor="blue.400"
          >
            <Text fontSize="11px" color="blue.800" fontWeight="medium" mb={1}>
              How to use:
            </Text>
            <VStack align="stretch" spacing={0.5}>
              <Text fontSize="10px" color="blue.700">
                • Click to add points
              </Text>
              <Text fontSize="10px" color="blue.700">
                • Drag handles to adjust curves
              </Text>
              <Text fontSize="10px" color="blue.700">
                • Click first point to close path
              </Text>
              <Text fontSize="10px" color="blue.700">
                • Press Enter or Finish when done
              </Text>
            </VStack>
          </Box>
        )}

        {/* Keyboard Shortcuts */}
        {hasPoints && (
          <Box 
            bg="gray.50" 
            p={2} 
            borderRadius="md"
            borderLeft="3px solid"
            borderColor="gray.300"
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
      </VStack>
    </Panel>
  );
};
