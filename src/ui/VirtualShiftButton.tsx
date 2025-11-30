import React from 'react';
import { Box, IconButton, useBreakpointValue } from '@chakra-ui/react';
import { ArrowBigUp } from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';
import { RenderCountBadgeWrapper } from './RenderCountBadgeWrapper';
import { useToggleButtonColors, useToolbarColors } from '../hooks/useToolbarColors';

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

  // Use shared color hooks
  const { activeBg, activeColor, activeHoverBg, inactiveHoverBg } = useToggleButtonColors();
  const { borderColor, borderWidth, shadow } = useToolbarColors();
  const inactiveBg = 'rgba(255, 255, 255, 0.95)';
  const inactiveBgDark = 'rgba(26, 32, 44, 0.95)';

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
        _dark={{ bg: isVirtualShiftActive ? activeBg : inactiveBgDark }}
        variant="solid"
        size="sm"
        borderRadius="full"
        boxShadow={shadow}
        sx={{
          width: '36px',
          height: '36px',
          minWidth: '36px',
          minHeight: '36px',
          backdropFilter: 'blur(10px)',
          backgroundColor: isVirtualShiftActive ? activeBg : inactiveBg,
          borderWidth: borderWidth,
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
