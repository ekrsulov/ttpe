import React from 'react';
import { Box, IconButton } from '@chakra-ui/react';
import { ArrowBigUp } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

interface VirtualShiftButtonProps {
  sidebarWidth?: number;
}

export const VirtualShiftButton: React.FC<VirtualShiftButtonProps> = ({
  sidebarWidth = 0,
}) => {
  const isVirtualShiftActive = useCanvasStore(state => state.isVirtualShiftActive);
  const toggleVirtualShift = useCanvasStore(state => state.toggleVirtualShift);

  const isSidebarPinned = sidebarWidth > 0;

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
        colorScheme={isVirtualShiftActive ? 'blue' : 'gray'}
        variant={isVirtualShiftActive ? 'solid' : 'outline'}
        size="sm"
        borderRadius="md"
        boxShadow="lg"
        sx={{
          width: '36px',
          height: '36px',
          minWidth: '36px',
          minHeight: '36px',
          backdropFilter: 'blur(10px)',
          backgroundColor: isVirtualShiftActive ? 'blue.500' : 'rgba(255, 255, 255, 0.95)',
          _hover: {
            backgroundColor: isVirtualShiftActive ? 'blue.600' : 'gray.100',
            transform: 'translateY(-1px)',
          },
          _active: {
            transform: 'translateY(0px)',
          },
          transition: 'all 0.15s ease',
        }}
      />
    </Box>
  );
};
