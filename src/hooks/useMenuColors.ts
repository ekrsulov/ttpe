import { useColorModeValue } from '@chakra-ui/react';

/**
 * Hook for consistent menu colors across components.
 * Used by FloatingContextMenu, dropdowns, and other menu-like UI.
 */
export const useMenuColors = () => {
  return {
    bg: useColorModeValue('white', 'gray.800'),
    borderColor: useColorModeValue('gray.200', 'gray.600'),
    hoverBg: useColorModeValue('gray.50', 'gray.700'),
    iconColor: useColorModeValue('gray.700', 'gray.300'),
    dangerColor: useColorModeValue('red.500', 'red.400'),
    dangerHoverBg: useColorModeValue('red.50', 'rgba(239, 68, 68, 0.1)'),
  };
};

/**
 * Common menu item styles that can be spread onto Box components.
 */
export const useMenuItemStyles = () => {
  const colors = useMenuColors();
  
  return {
    baseStyles: {
      px: 3,
      py: 2,
      w: 'full',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      transition: 'all 0.2s',
      bg: 'transparent',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'medium',
      _focus: { outline: 'none', boxShadow: 'none' },
      _active: { outline: 'none' },
      sx: {
        WebkitTapHighlightColor: 'transparent',
        '&:focus': { outline: 'none !important', boxShadow: 'none !important' },
        '&:focus-visible': { outline: 'none !important', boxShadow: 'none !important' },
      },
    },
    getHoverBg: (variant?: 'default' | 'danger') => 
      variant === 'danger' ? colors.dangerHoverBg : colors.hoverBg,
    getColor: (variant?: 'default' | 'danger') =>
      variant === 'danger' ? colors.dangerColor : colors.iconColor,
    colors,
  };
};
