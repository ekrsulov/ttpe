import React from 'react';
import { IconButton as ChakraIconButton, Button } from '@chakra-ui/react';
import type { SystemStyleObject } from '@chakra-ui/react';
import ConditionalTooltip from './ConditionalTooltip';

interface ToggleButtonProps {
  isActive: boolean;
  onClick: () => void;
  children?: React.ReactNode;
  icon?: React.ReactElement;
  'aria-label': string;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'text';
  isDisabled?: boolean;
  sx?: SystemStyleObject;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  isActive,
  onClick,
  children,
  icon,
  'aria-label': ariaLabel,
  title,
  size = 'sm',
  variant = 'icon',
  isDisabled = false,
  sx
}) => {
  const commonProps = {
    onClick,
    'aria-label': ariaLabel,
    title,
    variant: 'unstyled' as const,
    size,
    isDisabled,
    bg: isActive ? 'gray.600' : 'transparent',
    color: isActive ? 'white' : 'gray.700',
    border: '1px solid',
    borderColor: isActive ? 'gray.600' : 'gray.400',
    borderRadius: 'full',
    fontSize: size === 'sm' ? '10px' : size === 'md' ? '11px' : '12px',
    fontWeight: 'medium' as const,
    transition: 'all 0.2s',
    _hover: {
      bg: isActive ? 'gray.700' : 'gray.50'
    },
    _dark: {
      bg: isActive ? 'gray.400' : 'transparent',
      color: isActive ? 'gray.800' : 'gray.400',
      borderColor: isActive ? 'gray.400' : 'whiteAlpha.200',
      _hover: {
        bg: isActive ? 'gray.500' : 'whiteAlpha.100'
      }
    },
    sx: {
      minH: size === 'sm' ? '20px' : size === 'md' ? '24px' : '28px',
      h: size === 'sm' ? '20px' : size === 'md' ? '24px' : '28px',
      px: 1,
      py: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...(variant === 'icon' && {
        w: size === 'sm' ? '20px' : size === 'md' ? '24px' : '28px',
        minW: size === 'sm' ? '20px' : size === 'md' ? '24px' : '28px',
      }),
      ...sx
    }
  };

  if (variant === 'icon' && icon) {
    return (
      <ConditionalTooltip label={ariaLabel}>
        <ChakraIconButton
          {...commonProps}
          icon={icon}
        />
      </ConditionalTooltip>
    );
  }

  return (
    <ConditionalTooltip label={ariaLabel}>
      <Button {...commonProps}>
        {children}
      </Button>
    </ConditionalTooltip>
  );
};