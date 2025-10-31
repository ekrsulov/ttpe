import React from 'react';
import { Checkbox as ChakraCheckbox, useColorModeValue } from '@chakra-ui/react';

export interface PanelToggleProps {
  isChecked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDisabled?: boolean;
  accentColor?: string;
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
  accentColor = 'blue',
  children
}) => {
  const baseColor = `${accentColor}.500`;
  const hoverColor = `${accentColor}.600`;
  const borderColor = useColorModeValue('gray.400', 'whiteAlpha.500');
  const hoverBackground = useColorModeValue('gray.50', 'whiteAlpha.100');
  const textColor = useColorModeValue('gray.700', 'gray.200');

  return (
    <ChakraCheckbox
      isChecked={isChecked}
      onChange={onChange}
      isDisabled={isDisabled}
      size="sm"
      sx={{
        '& .chakra-checkbox__control': {
          bg: isChecked ? baseColor : 'transparent',
          borderColor: isChecked ? baseColor : borderColor,
          _checked: {
            bg: baseColor,
            borderColor: baseColor,
            color: 'white',
            _hover: {
              bg: hoverColor,
              borderColor: hoverColor,
            }
          },
          _hover: {
            bg: isChecked ? hoverColor : hoverBackground,
            borderColor: isChecked ? hoverColor : borderColor,
            _dark: {
              bg: isChecked ? hoverColor : 'whiteAlpha.100',
              borderColor: isChecked ? hoverColor : 'whiteAlpha.500',
            },
          },
          _disabled: {
            opacity: 0.4,
            cursor: 'not-allowed',
          },
          _dark: {
            borderColor: isChecked ? baseColor : 'whiteAlpha.500',
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
