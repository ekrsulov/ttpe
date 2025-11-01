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
  const checkedBg = useColorModeValue('gray.600', 'gray.400');
  const checkedBorder = useColorModeValue('gray.600', 'gray.400');
  const checkedHoverBg = useColorModeValue('gray.700', 'gray.500');
  const checkedHoverBorder = useColorModeValue('gray.700', 'gray.500');
  const checkedColor = useColorModeValue('white', 'gray.800');

  return (
    <ChakraCheckbox
      isChecked={isChecked}
      onChange={onChange}
      isDisabled={isDisabled}
      size="sm"
      sx={{
        '& .chakra-checkbox__control': {
          borderRadius: 'full',
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
              bg: isChecked ? 'gray.500' : 'whiteAlpha.100',
              borderColor: isChecked ? 'gray.500' : 'whiteAlpha.500',
            },
          },
          _disabled: {
            opacity: 0.4,
            cursor: 'not-allowed',
          },
          _dark: {
            borderColor: isChecked ? 'gray.400' : 'whiteAlpha.500',
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
