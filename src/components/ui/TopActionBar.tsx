import React from 'react';
import { Box, HStack, IconButton } from '@chakra-ui/react';
import { Menu } from 'lucide-react';
import { RenderCountBadgeWrapper } from './RenderCountBadgeWrapper';
import type { CanvasElement } from '../../types';
import { TOOL_DEFINITIONS } from '../../config/toolDefinitions';

interface TopActionBarProps {
  activeMode: string | null;
  onModeChange: (mode: string) => void;
  sidebarWidth?: number;
  isSidebarPinned?: boolean;
  isSidebarOpen?: boolean;
  onMenuClick?: () => void;
  selectedPaths?: CanvasElement[];
}

export const TopActionBar: React.FC<TopActionBarProps> = ({
  activeMode,
  onModeChange,
  sidebarWidth = 0,
  isSidebarPinned = false,
  isSidebarOpen = false,
  onMenuClick,
  selectedPaths = [],
}) => {
  const showMenuButton = !isSidebarPinned;
  const isPositionedForSidebar = sidebarWidth > 0;

  return (
    <Box
      position="fixed"
      top={{ base: 4, md: 6 }}
      left={isPositionedForSidebar ? "0" : "50%"}
      right={isPositionedForSidebar ? `${sidebarWidth}px` : "auto"}
      transform={isPositionedForSidebar ? "none" : "translateX(-50%)"}
      marginLeft={isPositionedForSidebar ? "auto" : 0}
      marginRight={isPositionedForSidebar ? "auto" : 0}
      width="fit-content"
      bg="white"
      borderRadius="xl"
      boxShadow="lg"
      px={1}
      py={1}
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
        {TOOL_DEFINITIONS.map(({ mode, icon: Icon, label }) => {
          const isDisabled = (() => {
            if (mode === 'transformation' || mode === 'edit') {
              return selectedPaths.length !== 1;
            }
            if (mode === 'subpath') {
              return selectedPaths.length !== 1 || (selectedPaths[0] && selectedPaths[0].data.subPaths.length <= 1);
            }
            return false;
          })();
          return (
            <IconButton
              key={mode}
              aria-label={label}
              icon={<Icon size={14} />}
              onClick={() => onModeChange(mode)}
              size="xs"
              variant={activeMode === mode ? 'solid' : 'ghost'}
              colorScheme={activeMode === mode ? 'blue' : 'gray'}
              title={label}
              isDisabled={isDisabled}
              sx={{
                minHeight: '28px',
                minWidth: '28px',
              }}
            />
          );
        })}
        
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
      <RenderCountBadgeWrapper componentName="TopActionBar" position="top-right" />
    </Box>
  );
};
