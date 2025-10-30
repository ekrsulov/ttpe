import React from 'react';
import { Box } from '@chakra-ui/react';
import { useDragResize } from '../../hooks/useDragResize';

interface SidebarResizerProps {
  onResize: (width: number) => void;
  onReset?: () => void; // Para doble click reset
  minWidth?: number;
  maxWidth?: number;
}

/**
 * Resizer component for sidebar - drag handle to adjust sidebar width
 * Uses the shared useDragResize hook for drag-to-resize logic
 */
export const SidebarResizer: React.FC<SidebarResizerProps> = ({
  onResize,
  onReset,
  minWidth = 200,
  maxWidth = 600,
}) => {
  const { isDragging, handlePointerDown, handleDoubleClick } = useDragResize({
    onResize,
    onReset,
    minValue: minWidth,
    maxValue: maxWidth,
    direction: 'horizontal',
    reverseHorizontal: true, // Sidebar resizes from right edge
  });

  return (
    <Box
      position="absolute"
      left={0}
      top={0}
      bottom={0}
      width="6px"
      cursor="ew-resize"
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      bg={isDragging ? 'blue.400' : 'transparent'}
      _hover={{
        bg: 'blue.200',
      }}
      title="Drag to resize, double-click to reset" // Tooltip informativo
      sx={{
        transition: isDragging ? 'none' : 'background-color 0.2s',
        zIndex: 1002, // Above sidebar content
        // Visual indicator
        '&::after': {
          content: '""',
          position: 'absolute',
          left: '2px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '2px',
          height: '40px',
          borderRadius: '1px',
          bg: isDragging ? 'white' : 'gray.400',
          opacity: isDragging ? 1 : 0,
          transition: 'opacity 0.2s',
        },
        '&:hover::after': {
          opacity: 0.6,
        },
      }}
    />
  );
};
