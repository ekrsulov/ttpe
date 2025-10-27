import React from 'react';
import {
  VStack,
  HStack,
  Button,
  Checkbox as ChakraCheckbox,
  Box,
  Divider,
  Switch,
  Flex,
  Heading
} from '@chakra-ui/react';
import { SliderControl } from '../../components/ui/SliderControl';
import { PercentSliderControl } from '../../components/ui/PercentSliderControl';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { RenderCountBadgeWrapper } from '../../components/ui/RenderCountBadgeWrapper';

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
  addPointMode?: {
    isActive: boolean;
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
  selectedSubpaths?: Array<{
    elementId: string;
    subpathIndex: number;
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
  activateAddPointMode?: () => void;
  deactivateAddPointMode?: () => void;
}

export const EditPanel: React.FC<EditPanelProps> = ({
  activePlugin,
  smoothBrush,
  addPointMode,
  pathSimplification,
  pathRounding,
  selectedCommands,
  selectedSubpaths = [],
  updateSmoothBrush,
  updatePathSimplification,
  updatePathRounding,
  applySmoothBrush,
  applyPathSimplification,
  applyPathRounding,
  activateSmoothBrush,
  deactivateSmoothBrush,
  resetSmoothBrush,
  activateAddPointMode,
  deactivateAddPointMode,
}) => {
  if (activePlugin !== 'edit') return null;

  // Determine if working with subpaths
  const hasSelectedSubpaths = selectedSubpaths && selectedSubpaths.length > 0;
  
  // Dynamic labels
  const pathSimplificationLabel = hasSelectedSubpaths ? "Subpath Simplification" : "Path Simplification";
  const roundPathLabel = hasSelectedSubpaths ? "Round Subpath" : "Round Path";

  return (
    <Box position="relative">
      <RenderCountBadgeWrapper componentName="EditPanel" position="top-left" />
      <VStack spacing={0} align="stretch">
      {/* Add Point Mode Section */}
      <Box>
        <Flex justify="space-between" align="center">
          <Heading size="xs" fontWeight="extrabold">Add Point</Heading>
          <Switch
            isChecked={addPointMode?.isActive || false}
            onChange={(e) => {
              if (e.target.checked) {
                activateAddPointMode?.();
              } else {
                deactivateAddPointMode?.();
              }
            }}
          />
        </Flex>
      </Box>

      {/* Separator between Add Point and Smooth Brush */}
      <Divider my={2} />

      {/* Smooth Brush Section */}
      <Box>
        <Flex justify="space-between" align="center" mb={1}>
          <Heading size="xs" fontWeight="extrabold">Smooth Brush</Heading>
          <HStack spacing={2}>
            {!smoothBrush.isActive && (
              <Button
                onClick={applySmoothBrush}
                size="xs"
                variant="outline"
                title={smoothBrush.isActive && selectedCommands.length > 0
                  ? `Apply Smooth to ${selectedCommands.length} Selected Point${selectedCommands.length === 1 ? '' : 's'}`
                  : 'Apply Smooth Brush'
                }
              >
                Apply
              </Button>
            )}
            <Switch
              isChecked={smoothBrush.isActive}
              onChange={(e) => {
                if (e.target.checked) {
                  activateSmoothBrush();
                } else {
                  deactivateSmoothBrush();
                }
              }}
            />
          </HStack>
        </Flex>

        {/* Simplify Points Checkbox */}
        <HStack justify="space-between" align="center">
          <ChakraCheckbox
            id="simplifyPoints"
            isChecked={smoothBrush.simplifyPoints}
            onChange={(e) => updateSmoothBrush({ simplifyPoints: e.target.checked })}
            size="sm"
            sx={{
              '& .chakra-checkbox__control': {
                bg: smoothBrush.simplifyPoints ? 'blue.500' : 'transparent',
                borderColor: smoothBrush.simplifyPoints ? 'blue.500' : 'gray.400',
                _checked: {
                  bg: 'blue.500',
                  borderColor: 'blue.500',
                  color: 'white',
                  _hover: {
                    bg: 'blue.600',
                    borderColor: 'blue.600',
                  }
                },
                _hover: {
                  bg: smoothBrush.simplifyPoints ? 'blue.600' : 'gray.50',
                  borderColor: smoothBrush.simplifyPoints ? 'blue.600' : 'gray.400',
                }
              }
            }}
          >
            Simplify Points
          </ChakraCheckbox>
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
            marginBottom='0'
          />
        )}

        {/* Strength Slider */}
        <PercentSliderControl
          label="Strength:"
          value={smoothBrush.strength}
          step={0.01}
          onChange={(value) => updateSmoothBrush({ strength: value })}
          labelWidth="40px"
          valueWidth="35px"
          marginBottom='0'
        />


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
            marginBottom='0'
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
            marginBottom='0'
          />
        )}

      </Box>

      {/* Separator between Smooth Brush and Path Simplification */}
      <Divider my={2} />

      {/* Path Simplification Section */}
      <Box>
        <SectionHeader
          title={pathSimplificationLabel}
          actionLabel="Apply"
          onAction={applyPathSimplification}
          actionTitle={pathSimplificationLabel}
        />

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
          marginBottom='0'
        />
      </Box>

      {/* Separator between Path Simplification and Round Path */}
      <Divider my={2} />

      {/* Round Path Section */}
      <Box>
        <SectionHeader
          title={roundPathLabel}
          actionLabel="Apply"
          onAction={applyPathRounding}
          actionTitle={roundPathLabel}
        />

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
          marginBottom='0'
        />
      </Box>
    </VStack>
    </Box>
  );
};