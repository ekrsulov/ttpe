/**
 * Unified theme colors hook
 * Consolidates all color hooks into a single source of truth.
 * 
 * Usage:
 *   const { toolbar, menu, panel, toggle, input, ruler } = useThemeColors();
 *   // or
 *   const colors = useThemeColors();
 *   colors.toolbar.bg // toolbar background
 */

import { useColorModeValue } from '@chakra-ui/react';

/**
 * Main unified theme colors hook.
 * Returns all color categories in a single call to minimize hook overhead.
 */
export function useThemeColors() {
  return {
    // Toolbar colors (FloatingToolbarShell, ToolbarIconButton)
    toolbar: {
      bg: useColorModeValue('surface.toolbar', 'surface.toolbar'),
      color: useColorModeValue('gray.700', 'gray.100'),
      borderColor: useColorModeValue('border.toolbar', 'border.toolbar'),
      borderWidth: useColorModeValue('0px', '1px'),
      shadow: useColorModeValue('0px 0px 10px 2px rgba(0, 0, 0, 0.1)', 'none'),
    },

    // Menu colors (FloatingContextMenu, dropdowns)
    menu: {
      bg: useColorModeValue('white', 'gray.800'),
      borderColor: useColorModeValue('gray.200', 'gray.600'),
      hoverBg: useColorModeValue('gray.50', 'gray.700'),
      iconColor: useColorModeValue('gray.700', 'gray.300'),
      dangerColor: useColorModeValue('red.500', 'red.400'),
      dangerHoverBg: useColorModeValue('red.50', 'rgba(239, 68, 68, 0.1)'),
    },

    // Panel header colors
    panelHeader: {
      hoverBg: useColorModeValue('gray.200', 'whiteAlpha.200'),
      iconColor: useColorModeValue('gray.600', 'gray.300'),
      titleColor: useColorModeValue('text.primary', 'text.primary'),
    },

    // Counter badge colors (toolbar buttons)
    counter: {
      neutral: {
        bg: useColorModeValue('gray.50', 'whiteAlpha.200'),
        color: useColorModeValue('gray.600', 'gray.200'),
      },
      danger: {
        bg: useColorModeValue('gray.50', 'whiteAlpha.200'),
        color: useColorModeValue('red.500', 'whiteAlpha.900'),
      },
    },

    // Panel button colors (ArrangePanel, etc.)
    panelButton: {
      color: useColorModeValue('gray.700', 'gray.100'),
      hoverBg: useColorModeValue('gray.100', 'whiteAlpha.200'),
      activeBg: useColorModeValue('gray.200', 'whiteAlpha.300'),
      panelBg: useColorModeValue('surface.panel', 'surface.panel'),
      borderColor: useColorModeValue('gray.200', 'whiteAlpha.300'),
    },

    // Expandable panel colors
    expandable: {
      bg: useColorModeValue('rgba(255, 255, 255, 1)', 'rgba(26, 32, 44, 1)'),
      borderColor: useColorModeValue('gray.200', 'gray.700'),
      iconColor: useColorModeValue('gray.600', 'gray.300'),
      hoverBg: useColorModeValue('gray.50', 'gray.700'),
    },

    // Form input colors (selects, inputs)
    input: {
      bg: useColorModeValue('white', 'whiteAlpha.100'),
      menuBg: useColorModeValue('white', 'gray.800'),
      borderColor: useColorModeValue('gray.300', 'whiteAlpha.300'),
      textColor: useColorModeValue('gray.800', 'gray.100'),
      hoverBg: useColorModeValue('gray.50', 'whiteAlpha.200'),
      selectedBg: useColorModeValue('gray.200', 'gray.700'),
      selectedColor: useColorModeValue('gray.800', 'gray.200'),
      placeholderColor: useColorModeValue('gray.500', 'gray.500'),
    },

    // Toggle button colors (active/inactive states)
    toggle: {
      inactive: {
        bg: useColorModeValue('transparent', 'transparent'),
        hoverBg: useColorModeValue('gray.50', 'whiteAlpha.100'),
        color: useColorModeValue('gray.700', 'gray.200'),
        border: useColorModeValue('gray.400', 'whiteAlpha.300'),
      },
      active: {
        bg: useColorModeValue('gray.800', 'gray.200'),
        color: useColorModeValue('white', 'gray.900'),
        hoverBg: useColorModeValue('gray.800', 'gray.200'),
      },
    },

    // Active tool colors (TopActionBar animated background)
    activeTool: {
      bg: useColorModeValue('gray.800', 'gray.200'),
      color: useColorModeValue('white', 'gray.900'),
    },

    // Ruler colors
    ruler: {
      bg: useColorModeValue('gray.100', 'gray.800'),
      textColor: useColorModeValue('gray.600', 'gray.400'),
      tickColor: useColorModeValue('gray.400', 'gray.500'),
      borderColor: useColorModeValue('gray.300', 'gray.600'),
      // Raw hex values for canvas rendering
      bgHex: useColorModeValue('#f7fafc', '#1a202c'),
      textHex: useColorModeValue('#718096', '#a0aec0'),
      tickHex: useColorModeValue('#a0aec0', '#718096'),
      borderHex: useColorModeValue('#e2e8f0', '#4a5568'),
    },

    // Panel toggle (checkbox) colors
    panelToggle: {
      borderColor: useColorModeValue('gray.400', 'whiteAlpha.500'),
      hoverBg: useColorModeValue('gray.50', 'whiteAlpha.100'),
      textColor: useColorModeValue('gray.600', 'gray.400'),
      checkedBg: useColorModeValue('gray.600', 'gray.400'),
      checkedBorder: useColorModeValue('gray.600', 'gray.400'),
      checkedHoverBg: useColorModeValue('gray.700', 'gray.500'),
      checkedHoverBorder: useColorModeValue('gray.700', 'gray.500'),
      checkedColor: useColorModeValue('white', 'gray.800'),
    },

    // Panel action button colors
    panelAction: {
      hoverBg: useColorModeValue('gray.300', 'whiteAlpha.400'),
      activeBg: useColorModeValue('gray.400', 'whiteAlpha.500'),
      iconColor: useColorModeValue('gray.600', 'gray.200'),
    },

    // Panel switch colors
    panelSwitch: {
      trackUnchecked: useColorModeValue('gray.300', 'gray.600'),
      trackChecked: useColorModeValue('gray.500', 'gray.400'),
      thumbBg: useColorModeValue('white', 'gray.100'),
    },
  };
}

/**
 * Focused styles that should be applied consistently to remove focus outlines.
 * Extract as constant to avoid duplication across components.
 */
export const NO_FOCUS_STYLES = {
  '&:focus': { outline: 'none !important', boxShadow: 'none !important' },
  '&:focus-visible': { outline: 'none !important', boxShadow: 'none !important' },
} as const;

/**
 * Extended no-focus styles including nested elements.
 * Used in containers like menus and popovers.
 */
export const NO_FOCUS_STYLES_DEEP = {
  ...NO_FOCUS_STYLES,
  '& *:focus': { outline: 'none !important' },
  '& *:focus-visible': { outline: 'none !important' },
} as const;
