import React from 'react';
import {
  Box,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { ChevronDown } from 'lucide-react';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  size?: 'sm' | 'md';
  isDisabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  size = 'sm',
  isDisabled = false,
}) => {
  const bg = useColorModeValue('white', 'whiteAlpha.100');
  const menuBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.300', 'whiteAlpha.300');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.200');
  const selectedBg = useColorModeValue('blue.50', 'blue.900');
  const selectedColor = useColorModeValue('blue.600', 'blue.200');

  const selectedOption = options.find(option => option.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const fontSize = size === 'sm' ? '12px' : '14px';
  const padding = size === 'sm' ? '4px 8px' : '6px 12px';
  const height = size === 'sm' ? '28px' : '32px';

  return (
    <Menu>
      <MenuButton
        as={Box}
        bg={bg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="full"
        color={textColor}
        cursor={isDisabled ? 'not-allowed' : 'pointer'}
        fontSize={fontSize}
        h={height}
        minW="120px"
        opacity={isDisabled ? 0.5 : 1}
        p={padding}
        pointerEvents={isDisabled ? 'none' : 'auto'}
        position="relative"
        whiteSpace="nowrap"
        _hover={{ bg: hoverBg }}
        _focus={{ outline: 'none', ring: 2, ringColor: 'blue.500' }}
      >
        <Text>{displayText}</Text>
        <Box
          position="absolute"
          right="8px"
          top="50%"
          transform="translateY(-50%)"
        >
          <ChevronDown size={14} />
        </Box>
      </MenuButton>
      <MenuList
        bg={menuBg}
        borderColor={borderColor}
        borderRadius="md"
        boxShadow="lg"
        minW="120px"
        zIndex={9999}
      >
        {options.map(option => (
          <MenuItem
            key={option.value}
            bg={option.value === value ? selectedBg : 'transparent'}
            color={option.value === value ? selectedColor : textColor}
            fontSize={fontSize}
            onClick={() => onChange(option.value)}
            _hover={{ bg: hoverBg }}
          >
            {option.label}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
};