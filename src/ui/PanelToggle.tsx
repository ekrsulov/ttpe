import React from 'react';
import { Checkbox as ChakraCheckbox, useColorModeValue } from '@chakra-ui/react';

export interface PanelToggleProps {
  isChecked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDisabled?: boolean;
  children: React.ReactNode;
}

/**
 * Reusable checkbox component for plugin panels
 * Provides consistent styling across Guidelines, Grid, and other panels
 */
export const PanelToggle: React.FC<PanelToggleProps> = ({
  isChecked,
  onChange,
  isDisabled = false,
  children
}) => {
  const borderColor = useColorModeValue('gray.400', 'whiteAlpha.500');
  const hoverBackground = useColorModeValue('gray.50', 'whiteAlpha.100');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const checkedBg = useColorModeValue('blue.500', 'blue.200');
  const checkedBorder = useColorModeValue('blue.500', 'blue.200');
  const checkedHoverBg = useColorModeValue('blue.600', 'blue.300');
  const checkedHoverBorder = useColorModeValue('blue.600', 'blue.300');
  const checkedColor = useColorModeValue('white', 'gray.800');

  return (
    <ChakraCheckbox
      isChecked={isChecked}
      onChange={onChange}
      isDisabled={isDisabled}
      size="sm"
      sx={{
        '& .chakra-checkbox__control': {
          bg: isChecked ? checkedBg : 'transparent',
          borderColor: isChecked ? checkedBorder : borderColor,
          _checked: {
            bg: checkedBg,
            borderColor: checkedBorder,
            color: checkedColor,
            _hover: {
              bg: checkedHoverBg,
              borderColor: checkedHoverBorder,
            }
          },
          _hover: {
            bg: isChecked ? checkedHoverBg : hoverBackground,
            borderColor: isChecked ? checkedHoverBorder : borderColor,
            _dark: {
              bg: isChecked ? 'blue.300' : 'whiteAlpha.100',
              borderColor: isChecked ? 'blue.300' : 'whiteAlpha.500',
            },
          },
          _disabled: {
            opacity: 0.4,
            cursor: 'not-allowed',
          },
          _dark: {
            borderColor: isChecked ? 'blue.200' : 'whiteAlpha.500',
          },
        },
        '& .chakra-checkbox__label': {
          color: textColor,
        }
      }}
    >
      {children}
    </ChakraCheckbox>
  );
};
