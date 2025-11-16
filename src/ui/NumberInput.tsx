import React, { useState, useEffect } from 'react';
import {
  HStack,
  Input,
  Text,
  Box
} from '@chakra-ui/react';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  icon?: React.ReactNode;
  labelWidth?: string;
  inputWidth?: string;
  resetAfterChange?: boolean; // New prop to reset value after onChange is called
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  icon,
  labelWidth = '40px',
  inputWidth = '60px',
  resetAfterChange = false
}) => {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    let numValue = parseFloat(inputValue);
    
    if (isNaN(numValue)) {
      numValue = value;
    } else {
      if (min !== undefined && numValue < min) {
        numValue = min;
      }
      if (max !== undefined && numValue > max) {
        numValue = max;
      }
    }
    
    if (resetAfterChange) {
      // For reset mode, call onChange with the value, then reset to 0
      if (numValue !== 0) {
        onChange(numValue);
        setInputValue('0');
      }
    } else {
      // Normal mode: sync state and call onChange
      setInputValue(numValue.toString());
      onChange(numValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newValue = Math.min(max ?? Infinity, value + step);
      onChange(newValue);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newValue = Math.max(min ?? -Infinity, value - step);
      onChange(newValue);
    }
  };

  return (
    <HStack spacing={2} w="100%">
      {icon && (
        <Box color="gray.600" _dark={{ color: 'gray.400' }} flexShrink={0}>
          {icon}
        </Box>
      )}
      <Text
        fontSize="12px"
        color="gray.600"
        _dark={{ color: 'gray.400' }}
        minW={labelWidth}
        flexShrink={0}
      >
        {label}
      </Text>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        type="text"
        textAlign="right"
        fontSize="12px"
        h="20px"
        w={inputWidth}
        px={2}
        borderRadius="0"
        borderColor="gray.300"
        bg="white"
        _dark={{
          borderColor: 'whiteAlpha.300',
          bg: 'gray.800'
        }}
        _focus={{
          borderColor: 'gray.600',
          boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)'
        }}
      />
      {suffix && (
        <Text
          fontSize="12px"
          color="gray.600"
          _dark={{ color: 'gray.400' }}
          flexShrink={0}
        >
          {suffix}
        </Text>
      )}
    </HStack>
  );
};
