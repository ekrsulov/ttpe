import React from 'react';
import { Box, type BoxProps, useColorModeValue } from '@chakra-ui/react';

export interface FloatingToolbarShellProps extends Omit<BoxProps, 'position'> {
  /**
   * Position of the toolbar: 'top' or 'bottom'
   */
  toolbarPosition?: 'top' | 'bottom';
  /**
   * Width of the sidebar for positioning calculations
   */
  sidebarWidth?: number;
  /**
   * Whether to show grid rulers (affects top toolbar positioning)
   */
  showGridRulers?: boolean;
  /**
   * Children components to render inside the toolbar
   */
  children: React.ReactNode;
}

/**
 * Shared shell for floating toolbars (Top & Bottom action bars)
 * Provides consistent positioning, shadows, backdrop blur, and responsiveness
 */
export const FloatingToolbarShell: React.FC<FloatingToolbarShellProps> = ({
  toolbarPosition = 'top',
  sidebarWidth = 0,
  showGridRulers = false,
  children,
  ...boxProps
}) => {
  const isSidebarPinned = sidebarWidth > 0;
  const toolbarBg = useColorModeValue('surface.toolbar', 'surface.toolbar');
  const toolbarColor = useColorModeValue('gray.700', 'gray.100');
  const borderColor = useColorModeValue('border.toolbar', 'border.toolbar');
  const borderWidth = useColorModeValue('0px', '1px');
  const toolbarShadow = useColorModeValue(toolbarPosition === 'bottom' ? '0px -4px 6px -1px rgba(0, 0, 0, 0.1)' : 'lg', 'none');

  // Calculate position based on toolbar type
  const positionProps = toolbarPosition === 'top'
    ? {
        top: showGridRulers
          ? { base: 6, md: 10 }
          : { base: 2, md: 6 },
      }
    : {
        bottom: { base: 2, md: 5 },
      };

  return (
    <Box
      position="fixed"
      {...positionProps}
      left={isSidebarPinned ? '0' : '50%'}
      right={isSidebarPinned ? `${sidebarWidth}px` : 'auto'}
      transform={isSidebarPinned ? 'none' : 'translateX(-50%)'}
      marginLeft={isSidebarPinned ? 'auto' : 0}
      marginRight={isSidebarPinned ? 'auto' : 0}
      width="fit-content"
      bg={toolbarBg}
      color={toolbarColor}
      borderRadius="full"
      borderWidth={borderWidth}
      borderColor={borderColor}
      boxShadow={toolbarShadow}
      px={1}
      py={1}
      zIndex={toolbarPosition === 'bottom' ? 1000 : 999}
      sx={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        backdropFilter: 'blur(10px)',
        ...boxProps.sx,
      }}
      {...boxProps}
    >
      {children}
    </Box>
  );
};
