import React from 'react';
import { Box, IconButton, type IconButtonProps } from '@chakra-ui/react';
import type { LucideIcon } from 'lucide-react';
import ConditionalTooltip from './ConditionalTooltip';

interface ToolbarIconButtonProps extends Omit<IconButtonProps, 'icon' | 'aria-label'> {
  icon: LucideIcon | React.ComponentType<{ size?: number }>;
  iconSize?: number;
  label: string;
  tooltip?: string;
  counter?: number;
  counterColor?: 'gray' | 'red';
  showTooltip?: boolean;
}

/**
 * Shared toolbar icon button component used across TopActionBar and BottomActionBar
 * Provides consistent sizing, styling, tooltips, and optional counter badges
 */
export const ToolbarIconButton: React.FC<ToolbarIconButtonProps> = ({
  icon: Icon,
  iconSize = 14,
  label,
  tooltip,
  counter,
  counterColor = 'gray',
  showTooltip = true,
  variant = 'ghost',
  colorScheme = 'gray',
  sx,
  ...iconButtonProps
}) => {
  const button = (
    <Box position="relative">
      <IconButton
        icon={<Icon size={iconSize} />}
        variant={variant}
        colorScheme={colorScheme}
        size="xs"
        sx={{
          minHeight: '28px',
          minWidth: '28px',
          ...sx,
        }}
        {...iconButtonProps}
        aria-label={label}
      />
      {counter !== undefined && counter > 0 && (
        <Box
          position="absolute"
          bottom="-4px"
          left="50%"
          transform="translateX(-50%)"
          bg={counterColor === 'red' ? 'red.50' : 'gray.50'}
          color={counterColor === 'red' ? 'red.500' : 'gray.600'}
          borderRadius="full"
          minW="16px"
          h="11px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="9px"
          fontWeight="bold"
          px="3px"
        >
          {counter}
        </Box>
      )}
    </Box>
  );

  if (showTooltip && (tooltip || label)) {
    return (
      <ConditionalTooltip label={tooltip ?? label} placement="top">
        {button}
      </ConditionalTooltip>
    );
  }

  return button;
};
