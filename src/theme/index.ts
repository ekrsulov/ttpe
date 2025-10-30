/**
 * Main theme configuration for TTPE application
 * Extends Chakra UI's default theme with custom tokens
 */

import { extendTheme, type ThemeConfig } from '@chakra-ui/react'
import { mode, type StyleFunctionProps } from '@chakra-ui/theme-tools'
import { colors } from './colors'
import { components } from './components'
import { typography, textStyles } from './typography'
import { spacing, radii, shadows, zIndices } from './spacing'

// Color mode configuration
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
}

// Extend Chakra's base theme
export const theme = extendTheme({
  config,
  
  // Design tokens
  colors,
  ...typography,
  space: spacing,
  radii,
  shadows,
  zIndices,
  
  // Text style presets
  textStyles,
  
  // Component customizations
  components,
  
  // Global styles
  styles: {
    global: (props: StyleFunctionProps) => ({
      body: {
        bg: mode('gray.50', 'gray.900')(props),
        color: mode('gray.800', 'gray.100')(props),
        fontFamily: 'body',
        fontSize: 'sm',
        lineHeight: 'normal',
      },
      // Smooth scrolling for panels
      '*': {
        scrollBehavior: 'smooth',
      },
      // Custom scrollbar for panels
      '*::-webkit-scrollbar': {
        width: '8px',
      },
      '*::-webkit-scrollbar-track': {
        bg: mode('gray.100', 'whiteAlpha.200')(props),
      },
      '*::-webkit-scrollbar-thumb': {
        bg: mode('gray.300', 'whiteAlpha.400')(props),
        borderRadius: 'md',
      },
      '*::-webkit-scrollbar-thumb:hover': {
        bg: mode('gray.400', 'whiteAlpha.500')(props),
      },
    }),
  },
  
  // Breakpoints for responsive design
  breakpoints: {
    base: '0em',    // 0px
    sm: '30em',     // ~480px
    md: '48em',     // ~768px (tablet)
    lg: '64em',     // ~1024px (desktop)
    xl: '80em',     // ~1280px
    '2xl': '96em',  // ~1536px
  },
})

// Internal type - not consumed externally
// export type Theme = typeof theme
