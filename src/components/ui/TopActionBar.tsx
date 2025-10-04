import React from 'react';
import { Box, HStack, IconButton } from '@chakra-ui/react';
import {
  MousePointer,
  Pen,
  Type,
  Shapes,
  Route,
  SquareDashedMousePointer,
  MousePointerClick,
  Menu
} from 'lucide-react';

type ToolMode = 'select' | 'pencil' | 'text' | 'shape' | 'subpath' | 'transformation' | 'edit';

interface TopActionBarProps {
  activeMode: string | null;
  onModeChange: (mode: string) => void;
  sidebarWidth?: number;
  isSidebarPinned?: boolean;
  isSidebarOpen?: boolean;
  onMenuClick?: () => void;
}

const actionTools: Array<{ mode: ToolMode; icon: React.ComponentType<{ size?: number }>; label: string }> = [
  { mode: 'select', icon: MousePointer, label: 'Select' },
  { mode: 'pencil', icon: Pen, label: 'Pencil' },
  { mode: 'text', icon: Type, label: 'Text' },
  { mode: 'shape', icon: Shapes, label: 'Shape' },
  { mode: 'subpath', icon: Route, label: 'Subpath' },
  { mode: 'transformation', icon: SquareDashedMousePointer, label: 'Transform' },
  { mode: 'edit', icon: MousePointerClick, label: 'Edit' },
];

export const TopActionBar: React.FC<TopActionBarProps> = ({
  activeMode,
  onModeChange,
  sidebarWidth = 0,
  isSidebarPinned = false,
  isSidebarOpen = false,
  onMenuClick,
}) => {

  const showMenuButton = !isSidebarPinned;
  const isPositionedForSidebar = sidebarWidth > 0;

  return (
    <Box
      position="fixed"
      top={{ base: 2, md: 3 }}
      left={isPositionedForSidebar ? "0" : "50%"}
      right={isPositionedForSidebar ? `${sidebarWidth}px` : "auto"}
      transform={isPositionedForSidebar ? "none" : "translateX(-50%)"}
      marginLeft={isPositionedForSidebar ? "auto" : 0}
      marginRight={isPositionedForSidebar ? "auto" : 0}
      width="fit-content"
      bg="white"
      borderRadius="xl"
      boxShadow="lg"
      py={{ base: 0.5, md: 1 }}
      px={{ base: 1.5, md: 2 }}
      zIndex={999}
      sx={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
      }}
    >
      <HStack 
        spacing={{ base: 0.5, md: 1 }}
        justify="center"
      >
        {/* Tool buttons */}
        {actionTools.map(({ mode, icon: Icon, label }) => (
          <IconButton
            key={mode}
            aria-label={label}
            icon={<Icon size={14} />}
            onClick={() => onModeChange(mode)}
            size="xs"
            variant={activeMode === mode ? 'solid' : 'ghost'}
            colorScheme={activeMode === mode ? 'blue' : 'gray'}
            title={label}
            sx={{
              minHeight: '28px',
              minWidth: '28px',
            }}
          />
        ))}
        
        {/* Hamburger menu button - al final */}
        {showMenuButton && (
          <IconButton
            aria-label="Toggle sidebar"
            icon={<Menu size={14} />}
            onClick={onMenuClick}
            size="xs"
            variant={isSidebarOpen ? 'solid' : 'ghost'}
            colorScheme={isSidebarOpen ? 'blue' : 'gray'}
            title="Toggle Menu"
            sx={{
              minHeight: '28px',
              minWidth: '28px',
            }}
          />
        )}
      </HStack>
    </Box>
  );
};
