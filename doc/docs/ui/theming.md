---
id: theming
title: Theming
sidebar_label: Theming
---

# Theming

TTPE uses Chakra UI with custom theme tokens.

## Color Tokens

### Light Mode

```json
{
  "colors": {
    "brand": {
      "500": "#007bff"
    },
    "gray": {
      "50": "#f8f9fa",
      "100": "#f5f5f5",
      "200": "#e9ecef",
      "500": "#adb5bd",
      "800": "#343a40"
    }
  },
  "semanticTokens": {
    "surface.canvas": "gray.50",
    "surface.panel": "white",
    "text.primary": "gray.800",
    "text.muted": "gray.600"
  }
}
```

### Dark Mode

```json
{
  "semanticTokens": {
    "surface.canvas": "gray.900",
    "surface.panel": "gray.800",
    "text.primary": "gray.100",
    "text.muted": "gray.400"
  }
}
```

## Typography

- **Font Family**: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI)
- **Font Sizes**: sm (14px), md (16px), lg (18px)
- **Line Heights**: normal (1.5), tight (1.25)

## Spacing

- Base unit: 4px
- Scale: 0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64

## Border Radius

- `sm`: 2px
- `md`: 4px
- `lg`: 8px
- `full`: 9999px

## Usage

```tsx
import { useColorMode } from '@chakra-ui/react';

const { colorMode, toggleColorMode } = useColorMode();
```

See `src/theme/` for complete theme configuration.
