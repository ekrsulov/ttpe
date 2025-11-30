import { useColorModeValue } from '@chakra-ui/react';

/**
 * Hook for consistent toolbar colors across components.
 * Used by FloatingToolbarShell, ToolbarIconButton, etc.
 */
export const useToolbarColors = () => {
  return {
    bg: useColorModeValue('surface.toolbar', 'surface.toolbar'),
    color: useColorModeValue('gray.700', 'gray.100'),
    borderColor: useColorModeValue('border.toolbar', 'border.toolbar'),
    borderWidth: useColorModeValue('0px', '1px'),
    shadow: useColorModeValue('0px 0px 10px 2px rgba(0, 0, 0, 0.1)', 'none'),
  };
};

/**
 * Hook for consistent panel header colors.
 */
export const usePanelHeaderColors = () => {
  return {
    hoverBg: useColorModeValue('gray.200', 'whiteAlpha.200'),
    iconColor: useColorModeValue('gray.600', 'gray.300'),
    titleColor: useColorModeValue('text.primary', 'text.primary'),
  };
};

/**
 * Hook for counter badge colors (used in toolbar buttons).
 */
export const useCounterColors = () => {
  return {
    neutral: {
      bg: useColorModeValue('gray.50', 'whiteAlpha.200'),
      color: useColorModeValue('gray.600', 'gray.200'),
    },
    danger: {
      bg: useColorModeValue('gray.50', 'whiteAlpha.200'),
      color: useColorModeValue('red.500', 'whiteAlpha.900'),
    },
  };
};

/**
 * Hook for button colors in panels (ArrangePanel, etc.)
 */
export const usePanelButtonColors = () => {
  return {
    color: useColorModeValue('gray.700', 'gray.100'),
    hoverBg: useColorModeValue('gray.100', 'whiteAlpha.200'),
    activeBg: useColorModeValue('gray.200', 'whiteAlpha.300'),
    panelBg: useColorModeValue('surface.panel', 'surface.panel'),
    borderColor: useColorModeValue('gray.200', 'whiteAlpha.300'),
  };
};

/**
 * Hook for expandable panel colors.
 */
export const useExpandablePanelColors = () => {
  return {
    bg: useColorModeValue('rgba(255, 255, 255, 1)', 'rgba(26, 32, 44, 1)'),
    borderColor: useColorModeValue('gray.200', 'gray.700'),
    iconColor: useColorModeValue('gray.600', 'gray.300'),
    hoverBg: useColorModeValue('gray.50', 'gray.700'),
  };
};

/**
 * Hook for form input colors (selects, inputs, etc.)
 */
export const useInputColors = () => {
  return {
    bg: useColorModeValue('white', 'whiteAlpha.100'),
    menuBg: useColorModeValue('white', 'gray.800'),
    borderColor: useColorModeValue('gray.300', 'whiteAlpha.300'),
    textColor: useColorModeValue('gray.800', 'gray.100'),
    hoverBg: useColorModeValue('gray.50', 'whiteAlpha.200'),
    selectedBg: useColorModeValue('gray.200', 'gray.700'),
    selectedColor: useColorModeValue('gray.800', 'gray.200'),
    placeholderColor: useColorModeValue('gray.500', 'gray.500'),
  };
};

/**
 * Hook for active/inactive toggle button colors.
 */
export const useToggleButtonColors = () => {
  return {
    inactiveBg: useColorModeValue('transparent', 'transparent'),
    inactiveHoverBg: useColorModeValue('gray.50', 'whiteAlpha.100'),
    inactiveColor: useColorModeValue('gray.700', 'gray.200'),
    inactiveBorder: useColorModeValue('gray.400', 'whiteAlpha.300'),
    activeBg: useColorModeValue('gray.800', 'gray.200'),
    activeColor: useColorModeValue('white', 'gray.900'),
    activeHoverBg: useColorModeValue('gray.800', 'gray.200'),
  };
};
