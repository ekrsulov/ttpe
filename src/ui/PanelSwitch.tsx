import React from 'react';
import { Switch, type SwitchProps, useColorModeValue } from '@chakra-ui/react';

export interface PanelSwitchProps extends Omit<SwitchProps, 'isChecked' | 'onChange'> {
  isChecked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Reusable switch component for plugin panels
 * Provides consistent gray-toned styling across light and dark modes
 * Used in Edit panel for Add Point and Smooth Brush toggles
 */
export const PanelSwitch: React.FC<PanelSwitchProps> = ({
  isChecked,
  onChange,
  ...restProps
}) => {
  // Track background colors - gray tones for both modes
  const trackBgUnchecked = useColorModeValue('gray.300', 'gray.600');
  const trackBgChecked = useColorModeValue('gray.500', 'gray.400');
  
  // Thumb (circle) background - always white/light
  const thumbBg = useColorModeValue('white', 'gray.100');
  
  return (
    <Switch
      isChecked={isChecked}
      onChange={onChange}
      size="sm"
      sx={{
        '& .chakra-switch__track': {
          bg: isChecked ? trackBgChecked : trackBgUnchecked,
          _checked: {
            bg: trackBgChecked,
          },
        },
        '& .chakra-switch__thumb': {
          bg: thumbBg,
        },
      }}
      {...restProps}
    />
  );
};
