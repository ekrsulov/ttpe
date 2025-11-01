import React from 'react';
import { Box, IconButton, useBreakpointValue, useColorModeValue } from '@chakra-ui/react';
import { ArrowBigUp } from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';
import { RenderCountBadgeWrapper } from './RenderCountBadgeWrapper';

interface VirtualShiftButtonProps {
  sidebarWidth?: number;
}

export const VirtualShiftButton: React.FC<VirtualShiftButtonProps> = ({
  sidebarWidth = 0,
}) => {
  const isVirtualShiftActive = useCanvasStore(state => state.isVirtualShiftActive);
  const toggleVirtualShift = useCanvasStore(state => state.toggleVirtualShift);

  const isSidebarPinned = sidebarWidth > 0;
  const isMobile = useBreakpointValue({ base: true, md: false }, { fallback: 'md' });

  // Colors that adapt to dark mode
  const inactiveBg = useColorModeValue('rgba(255, 255, 255, 0.95)', 'rgba(26, 32, 44, 0.95)');
  const inactiveHoverBg = useColorModeValue('gray.100', 'whiteAlpha.200');
  const activeBg = useColorModeValue('gray.800', 'gray.200');
  const activeColor = useColorModeValue('white', 'gray.900');
  const activeHoverBg = useColorModeValue('gray.800', 'gray.200');
  const borderColor = useColorModeValue('border.toolbar', 'border.toolbar');

  // Only show on mobile devices
  if (!isMobile) {
    return null;
  }

  return (
    <Box
      position="fixed"
      bottom={{ base: 2, md: 3 }}
      right={isSidebarPinned ? `${sidebarWidth + 20}px` : "20px"}
      zIndex={999}
    >
      <IconButton
        aria-label="Toggle Virtual Shift"
        icon={<ArrowBigUp size={16} />}
        onClick={toggleVirtualShift}
        bg={isVirtualShiftActive ? activeBg : inactiveBg}
        color={isVirtualShiftActive ? activeColor : undefined}
        _hover={{ bg: isVirtualShiftActive ? activeHoverBg : inactiveHoverBg }}
        variant="solid"
        size="sm"
        borderRadius="full"
        boxShadow="lg"
        sx={{
          width: '36px',
          height: '36px',
          minWidth: '36px',
          minHeight: '36px',
          backdropFilter: 'blur(10px)',
          backgroundColor: isVirtualShiftActive ? activeBg : inactiveBg,
          borderWidth: '1px',
          borderColor: borderColor,
          _hover: {
            backgroundColor: isVirtualShiftActive ? activeHoverBg : inactiveHoverBg,
            transform: 'translateY(-1px)',
          },
          _active: {
            transform: 'translateY(0px)',
          },
          transition: 'all 0.15s ease',
        }}
      />
      <RenderCountBadgeWrapper componentName="VirtualShiftButton" position="top-right" />
    </Box>
  );
};
