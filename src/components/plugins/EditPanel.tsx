import React from 'react';
import {
  VStack,
  HStack,
  Button,
  Checkbox as ChakraCheckbox,
  Text,
  Box,
  Flex,
  Heading
} from '@chakra-ui/react';
import { PaintBucket, Zap, RotateCcw } from 'lucide-react';
import { SliderControl } from '../ui/SliderControl';

interface EditPanelProps {
  activePlugin: string | null;
  smoothBrush: {
    radius: number;
    strength: number;
    isActive: boolean;
    cursorX: number;
    cursorY: number;
    simplifyPoints: boolean;
    simplificationTolerance: number;
    minDistance: number;
    affectedPoints: Array<{
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
    }>;
  };
  pathSimplification: {
    tolerance: number;
  };
  pathRounding: {
    radius: number;
  };
  selectedCommands: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
  }>;
  updateSmoothBrush: (brush: Partial<EditPanelProps['smoothBrush']>) => void;
  updatePathSimplification: (settings: Partial<EditPanelProps['pathSimplification']>) => void;
  updatePathRounding: (settings: Partial<EditPanelProps['pathRounding']>) => void;
  applySmoothBrush: () => void;
  applyPathSimplification: () => void;
  applyPathRounding: () => void;
  activateSmoothBrush: () => void;
  deactivateSmoothBrush: () => void;
  resetSmoothBrush: () => void;
}

export const EditPanel: React.FC<EditPanelProps> = ({
  activePlugin,
  smoothBrush,
  pathSimplification,
  pathRounding,
  selectedCommands,
  updateSmoothBrush,
  updatePathSimplification,
  updatePathRounding,
  applySmoothBrush,
  applyPathSimplification,
  applyPathRounding,
  activateSmoothBrush,
  deactivateSmoothBrush,
  resetSmoothBrush,
}) => {
  if (activePlugin !== 'edit') return null;

  return (
    <VStack spacing={2} align="stretch">
      {/* Smooth Brush Section */}
      <Box>
        <Flex 
          align="center" 
          justify="space-between" 
          mb={2} 
          bg="transparent" 
          py={0} 
          px={0}
          borderRadius="md"
          minH="24px"
        >
          <HStack spacing={1.5}>
            <PaintBucket size={16} color="#666" />
            <Heading size="xs" fontWeight="extrabold">Smooth Brush</Heading>
          </HStack>
          {(!smoothBrush.isActive || (smoothBrush.isActive && selectedCommands.length > 0)) && (
            <Button
              onClick={applySmoothBrush}
              size="xs"
              variant="outline"
              fontSize="12px"
              title={smoothBrush.isActive && selectedCommands.length > 0
                ? `Apply Smooth to ${selectedCommands.length} Selected Point${selectedCommands.length === 1 ? '' : 's'}`
                : 'Apply Smooth Brush'
              }
            >
              Apply
            </Button>
          )}
        </Flex>

        {/* Brush Mode Toggle */}
        <HStack spacing={2} mb={2}>
          <Text fontSize="12px" color="gray.600">Brush Mode:</Text>
          <Button
            onClick={() => {
              if (smoothBrush.isActive) {
                deactivateSmoothBrush();
              } else {
                activateSmoothBrush();
              }
            }}
            size="xs"
            colorScheme={smoothBrush.isActive ? 'brand' : 'gray'}
            variant={smoothBrush.isActive ? 'solid' : 'outline'}
          >
            {smoothBrush.isActive ? 'On' : 'Off'}
          </Button>
          
          <Button
            onClick={resetSmoothBrush}
            size="xs"
            variant="outline"
            colorScheme="gray"
            title="Reset all smooth brush settings to defaults"
          >
            Reset
          </Button>
        </HStack>

        {/* Radius Slider - only show when brush mode is active */}
        {smoothBrush.isActive && (
          <SliderControl
            label="Radius:"
            value={smoothBrush.radius}
            min={6}
            max={60}
            step={1}
            onChange={(value) => updateSmoothBrush({ radius: value })}
            labelWidth="40px"
            valueWidth="25px"
          />
        )}

        {/* Strength Slider */}
        <SliderControl
          label="Strength:"
          value={smoothBrush.strength}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => updateSmoothBrush({ strength: value })}
          formatter={(value) => `${(value * 100).toFixed(0)}%`}
          labelWidth="40px"
          valueWidth="35px"
        />

        {/* Simplify Points Checkbox */}
        <ChakraCheckbox
          id="simplifyPoints"
          isChecked={smoothBrush.simplifyPoints}
          onChange={(e) => updateSmoothBrush({ simplifyPoints: e.target.checked })}
          size="sm"
          mb={smoothBrush.simplifyPoints ? 2 : 0}
        >
          Simplify Points
        </ChakraCheckbox>

        {/* Simplification Tolerance Slider - only show when simplify points is enabled */}
        {smoothBrush.simplifyPoints && (
          <SliderControl
            label="Tolerance:"
            value={smoothBrush.simplificationTolerance}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(value) => updateSmoothBrush({ simplificationTolerance: value })}
            formatter={(value) => value.toFixed(1)}
            labelWidth="40px"
            valueWidth="30px"
          />
        )}

        {/* Minimum Distance Slider - only show when simplify points is enabled */}
        {smoothBrush.simplifyPoints && (
          <SliderControl
            label="Min Dist:"
            value={smoothBrush.minDistance}
            min={0.1}
            max={5.0}
            step={0.1}
            onChange={(value) => updateSmoothBrush({ minDistance: value })}
            formatter={(value) => value.toFixed(1)}
            labelWidth="40px"
            valueWidth="30px"
          />
        )}

        {/* Instructions */}
        {smoothBrush.isActive && (
          <Text fontSize="12px" color="gray.600" mt={2} lineHeight="tall">
            {selectedCommands.length > 0
              ? `Click "Apply Smooth" to smooth ${selectedCommands.length} selected point${selectedCommands.length === 1 ? '' : 's'}.`
              : 'Click and drag to apply smoothing. Points within the brush radius will be smoothed.'
            }
          </Text>
        )}
      </Box>

      {/* Path Simplification Section */}
      <Box>
        <Flex 
          align="center" 
          justify="space-between" 
          mb={2} 
          bg="transparent" 
          py={0} 
          px={0}
          borderRadius="md"
        >
          <HStack spacing={1.5}>
            <Zap size={16} color="#666" />
            <Heading size="xs" fontWeight="extrabold">Path Simplification</Heading>
          </HStack>
          <Button
            onClick={applyPathSimplification}
            size="xs"
            variant="outline"
            fontSize="12px"
            title="Simplify Path"
          >
            Apply
          </Button>
        </Flex>

        <SliderControl
          label="Tolerance:"
          value={pathSimplification.tolerance}
          min={0.01}
          max={10}
          step={0.01}
          onChange={(value) => updatePathSimplification({ tolerance: value })}
          formatter={(value) => value.toFixed(2)}
          labelWidth="50px"
          valueWidth="35px"
        />
      </Box>

      {/* Round Path Section */}
      <Box>
        <Flex 
          align="center" 
          justify="space-between" 
          mb={2} 
          bg="transparent" 
          py={0} 
          px={0}
          borderRadius="md"
        >
          <HStack spacing={1.5}>
            <RotateCcw size={16} color="#666" />
            <Heading size="xs" fontWeight="extrabold">Round Path</Heading>
          </HStack>
          <Button
            onClick={applyPathRounding}
            size="xs"
            variant="outline"
            fontSize="12px"
            title="Round Path"
          >
            Apply
          </Button>
        </Flex>

        <SliderControl
          label="Radius:"
          value={pathRounding.radius}
          min={0.1}
          max={50}
          step={0.1}
          onChange={(value) => updatePathRounding({ radius: value })}
          formatter={(value) => value.toFixed(1)}
          labelWidth="50px"
          valueWidth="35px"
        />
      </Box>
    </VStack>
  );
};