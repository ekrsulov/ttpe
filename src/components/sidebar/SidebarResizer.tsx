import React, { useState, useCallback, useEffect } from 'react';
import { Box } from '@chakra-ui/react';

interface SidebarResizerProps {
  onResize: (width: number) => void;
  onReset?: () => void; // Para doble click reset
  minWidth?: number;
  maxWidth?: number;
}

/**
 * Resizer component for sidebar - drag handle to adjust sidebar width
 */
export const SidebarResizer: React.FC<SidebarResizerProps> = ({
  onResize,
  onReset,
  minWidth = 200,
  maxWidth = 600,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onReset?.(); // Reset al ancho inicial
  }, [onReset]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      // Calculate new width based on mouse position from right edge
      const newWidth = window.innerWidth - e.clientX;

      // Constrain within min/max bounds
      const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);

      onResize(constrainedWidth);
    },
    [isDragging, minWidth, maxWidth, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove global mouse listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <Box
      position="absolute"
      left={0}
      top={0}
      bottom={0}
      width="6px"
      cursor="ew-resize"
      onMouseDown={handleMouseDown}
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
