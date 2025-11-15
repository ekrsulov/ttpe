import React, { useState, useEffect } from 'react';
import {
  Box,
  HStack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text,
  VStack,
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
  const currentStep = stepFunction ? stepFunction(value) : step;
  const formattedValue = formatter ? formatter(value) : (currentStep < 1 ? value.toFixed(2) : value.toString());
  const isPercent = formattedValue.includes('%');

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(isPercent ? (value * 100).toString() : value.toString());

  // Update editValue when value changes
  useEffect(() => {
    setEditValue(isPercent ? (value * 100).toString() : value.toString());
  }, [value, isPercent]);

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

  const handleEditConfirm = () => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      const actualValue = isPercent ? parsed / 100 : parsed;
      handleChange(Math.max(min, Math.min(max, actualValue)));
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditValue(isPercent ? (value * 100).toString() : value.toString());
    setIsEditing(false);
  };

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
      <VStack spacing="2px" alignItems="flex-end" w={valueWidth} flexShrink={0} ml={gap}>
        <Box
          minH="20px"
          w="100%"
          borderWidth="1px"
          borderColor={isEditing ? 'gray.600' : 'gray.300'}
          bg="white"
          _dark={{ borderColor: isEditing ? 'gray.300' : 'whiteAlpha.300', bg: 'gray.800' }}
          _focusWithin={{ borderColor: 'gray.600', boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)' }}
          opacity={isEditing ? 1 : 0.95}
          aria-hidden="true"
          onClick={isEditing ? undefined : () => setIsEditing(true)}
          px="2px"
          py="0px"
          borderRadius="0"
        >
          {isEditing ? (
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditConfirm}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleEditConfirm();
                } else if (e.key === 'Escape') {
                  handleEditCancel();
                }
              }}
              style={{
                fontSize: '11px',
                color: 'inherit',
                width: '100%',
                textAlign: 'right',
                border: 'none',
                outline: 'none',
                background: 'transparent'
              }}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
          ) : (
            <Text
              fontSize="11px"
              color="gray.600"
              _dark={{ color: 'gray.400' }}
              textAlign="right"
              w="100%"
            >
              {formattedValue}
            </Text>
          )}
        </Box>
      </VStack>
    </HStack>
  );
};