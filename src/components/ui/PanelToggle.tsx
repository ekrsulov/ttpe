import React from 'react';
import { Checkbox as ChakraCheckbox } from '@chakra-ui/react';

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

  return (
    <ChakraCheckbox
      isChecked={isChecked}
      onChange={onChange}
      isDisabled={isDisabled}
      size="sm"
      sx={{
        '& .chakra-checkbox__control': {
          bg: isChecked ? baseColor : 'transparent',
          borderColor: isChecked ? baseColor : 'gray.400',
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
            bg: isChecked ? hoverColor : 'gray.50',
            borderColor: isChecked ? hoverColor : 'gray.400',
          },
          _disabled: {
            opacity: 0.4,
            cursor: 'not-allowed',
          }
        }
      }}
    >
      {children}
    </ChakraCheckbox>
  );
};
