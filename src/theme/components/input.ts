/**
 * Input component theme for TTPE
 * Used in form controls throughout panels
 */

export const Input = {
  baseStyle: {
    field: {
      borderRadius: 'md',
      fontSize: 'sm',
      transition: 'all 0.2s ease',
      _focusVisible: {
        borderColor: 'brand.500',
        boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
      },
    },
  },

  sizes: {
    sm: {
      field: {
        fontSize: 'sm',
        px: 2,
        h: '32px',
      },
    },
    md: {
      field: {
        fontSize: 'sm',
        px: 3,
        h: '36px',
      },
    },
  },

  variants: {
    outline: {
      field: {
        bg: 'white',
        border: '1px solid',
        borderColor: 'gray.300',
        _hover: {
          borderColor: 'gray.400',
        },
        _invalid: {
          borderColor: 'error.500',
          boxShadow: '0 0 0 1px var(--chakra-colors-error-500)',
        },
        _disabled: {
          opacity: 0.6,
          cursor: 'not-allowed',
          bg: 'gray.50',
        },
      },
    },
    filled: {
      field: {
        bg: 'gray.100',
        border: '1px solid transparent',
        _hover: {
          bg: 'gray.200',
        },
        _focusVisible: {
          bg: 'white',
          borderColor: 'brand.500',
        },
      },
    },
  },

  defaultProps: {
    size: 'sm',
    variant: 'outline',
  },
}
