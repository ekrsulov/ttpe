import React from 'react';
import { Box, type BoxProps } from '@chakra-ui/react';

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
      bg="white"
      borderRadius="xl"
      boxShadow="lg"
      px={1}
      py={1}
      zIndex={toolbarPosition === 'bottom' ? 1000 : 999}
      sx={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        ...boxProps.sx,
      }}
      {...boxProps}
    >
      {children}
    </Box>
  );
};
