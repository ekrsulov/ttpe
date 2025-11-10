import React from 'react';
import {
  Box,
  HStack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text
} from '@chakra-ui/react';

interface SliderControlProps {
  icon?: React.ReactNode;
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  stepFunction?: (value: number) => number; // Dynamic step function
  onChange: (value: number) => void;
  formatter?: (value: number) => string;
  title?: string;
  minWidth?: string;
  labelWidth?: string;
  valueWidth?: string;
  marginBottom?: string;
  inline?: boolean; // New prop for inline usage
  gap?: string; // Custom gap for inline usage
}

export const SliderControl: React.FC<SliderControlProps> = ({
  icon,
  label,
  value,
  min,
  max,
  step = 1,
  stepFunction,
  onChange,
  formatter,
  title,
  minWidth = '60px',
  labelWidth = '40px',
  valueWidth = '50px',
  marginBottom = '6px',
  inline = false,
  gap = '8px'
}) => {
  const handleChange = (newValue: number) => {
    // If stepFunction is provided, quantize the value to the appropriate step
    if (stepFunction) {
      const dynamicStep = stepFunction(newValue);
      const quantizedValue = Math.round(newValue / dynamicStep) * dynamicStep;
      onChange(Math.max(min, Math.min(max, quantizedValue)));
    } else {
      onChange(newValue);
    }
  };

  const currentStep = stepFunction ? stepFunction(value) : step;
  const formattedValue = formatter ? formatter(value) : (currentStep < 1 ? value.toFixed(2) : value.toString());

  return (
    <HStack
      spacing={gap}
      mb={inline ? 0 : marginBottom}
      w={inline ? '100%' : undefined}
    >
      {icon && (
        <Box color="gray.600" _dark={{ color: 'gray.400' }} flexShrink={0}>
          {icon}
        </Box>
      )}
      {label && (
        <Text
          fontSize="12px"
          color="gray.600"
          _dark={{ color: 'gray.400' }}
          minW={labelWidth}
          flexShrink={0}
        >
          {label}
        </Text>
      )}
      <Slider
        flex={1}
        min={min}
        max={max}
        step={stepFunction ? 0.01 : step} // Use very small step when stepFunction is provided
        value={value}
        onChange={handleChange}
        minW={minWidth}
        title={title}
      >
        <SliderTrack h="4px" borderRadius="2px" bg="gray.300" _dark={{ bg: 'gray.600' }}>
          <SliderFilledTrack bg="gray.600" _dark={{ bg: 'gray.400' }} />
        </SliderTrack>
        <SliderThumb boxSize="12px" />
      </Slider>
      <Text
        fontSize="12px"
        color="gray.600"
        _dark={{ color: 'gray.400' }}
        w={valueWidth}
        textAlign="right"
        flexShrink={0}
      >
        {formattedValue}
      </Text>
    </HStack>
  );
};