/**
 * Color palette for TTPE application
 * Based on existing brand colors with Chakra UI scales
 */

export const colors = {
  // Primary brand color (blue from existing #007bff)
  brand: {
    50: '#e6f2ff',
    100: '#b3d9ff',
    200: '#80bfff',
    300: '#4da6ff',
    400: '#1a8cff',
    500: '#007bff', // Primary brand color (current active state)
    600: '#0062cc',
    700: '#004a99',
    800: '#003166',
    900: '#001933',
  },

  // Sidebar-specific semantic colors
  sidebar: {
    bg: 'rgba(249, 249, 249, 0.95)',
    panelBg: '#ffffff',
    headerBg: '#f5f5f5',
    border: '#cccccc',
    divider: '#dee2e6',
    toolBg: '#f8f9fa',
    toolHover: '#e9ecef',
    toolActive: '#007bff',
    toolActiveText: '#ffffff',
  },

  // Extended gray scale for UI elements
  gray: {
    50: '#f8f9fa',
    100: '#f5f5f5',
    200: '#e9ecef',
    300: '#dee2e6',
    400: '#ced4da',
    500: '#adb5bd',
    600: '#6c757d',
    700: '#495057',
    800: '#343a40',
    900: '#212529',
  },

  // Semantic colors for states and feedback
  success: {
    50: '#d4edda',
    100: '#c3e6cb',
    200: '#b1dfbb',
    300: '#a0d8ab',
    400: '#8ed19b',
    500: '#28a745',
    600: '#218838',
    700: '#1e7e34',
    800: '#1b6f2e',
    900: '#155724',
  },

  warning: {
    50: '#fff3cd',
    100: '#ffecb5',
    200: '#ffe69c',
    300: '#ffdf84',
    400: '#ffd96b',
    500: '#ffc107',
    600: '#e0a800',
    700: '#c69500',
    800: '#ad8200',
    900: '#936f00',
  },

  error: {
    50: '#f8d7da',
    100: '#f5c6cb',
    200: '#f1b0b7',
    300: '#ed969e',
    400: '#e97c85',
    500: '#dc3545',
    600: '#c82333',
    700: '#bd2130',
    800: '#b21f2d',
    900: '#a71d2a',
  },

  info: {
    50: '#d1ecf1',
    100: '#bee5eb',
    200: '#abdde5',
    300: '#98d6df',
    400: '#85ced9',
    500: '#17a2b8',
    600: '#138496',
    700: '#117a8b',
    800: '#0e6f80',
    900: '#0c6475',
  },
}
