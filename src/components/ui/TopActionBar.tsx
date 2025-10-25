import React from 'react';
import { Box, HStack, IconButton } from '@chakra-ui/react';
import { Menu } from 'lucide-react';
import { RenderCountBadgeWrapper } from './RenderCountBadgeWrapper';
import type { CanvasElement } from '../../types';
import { TOOL_DEFINITIONS } from '../../config/toolDefinitions';
import type { ToolMode } from '../../config/toolDefinitions';
import { pluginManager } from '../../utils/pluginManager';
import { useCanvasStore } from '../../store/canvasStore';

const TOOL_DEFINITION_MAP = new Map(
  TOOL_DEFINITIONS.map((definition) => [definition.mode, definition])
);

interface TopActionBarProps {
  activeMode: string | null;
  onModeChange: (mode: string) => void;
  sidebarWidth?: number;
  isSidebarPinned?: boolean;
  isSidebarOpen?: boolean;
  onMenuClick?: () => void;
  selectedPaths?: CanvasElement[];
  showGridRulers?: boolean;
}

export const TopActionBar: React.FC<TopActionBarProps> = ({
  activeMode,
  onModeChange,
  sidebarWidth = 0,
  isSidebarPinned = false,
  isSidebarOpen = false,
  onMenuClick,
  selectedPaths = [],
  showGridRulers = false,
}) => {
  const showMenuButton = !isSidebarPinned;
  const isPositionedForSidebar = sidebarWidth > 0;
  
  // Get grid state to conditionally show gridFill tool
  const gridEnabled = useCanvasStore(state => state.grid?.enabled ?? false);
  
  // Calculate top position - move down when grid rulers are shown
  const baseTop = { base: 2, md: 6 };
  const topWithRulers = { base: 6, md: 10 };
  const topPosition = showGridRulers ? topWithRulers : baseTop;

  const registeredTools = pluginManager
    .getRegisteredTools()
    .filter((plugin) => TOOL_DEFINITION_MAP.has(plugin.id as ToolMode))
    .filter((plugin) => {
      // Only show gridFill if grid is enabled
      if (plugin.id === 'gridFill') {
        return gridEnabled;
      }
      return true;
    })
    .map((plugin) => {
      const fallbackDefinition = TOOL_DEFINITION_MAP.get(plugin.id as ToolMode);
      const Icon = plugin.metadata.icon ?? fallbackDefinition?.icon ?? Menu;

      return {
        id: plugin.id,
        label: plugin.metadata.label ?? fallbackDefinition?.label ?? plugin.id,
        icon: Icon,
        order: fallbackDefinition?.order ?? 999,
      };
    })
    .sort((a, b) => a.order - b.order);

  const toolsToRender = registeredTools.length
    ? registeredTools
    : TOOL_DEFINITIONS
        .filter((def) => def.mode !== 'gridFill' || gridEnabled)
        .sort((a, b) => a.order - b.order)
        .map(({ mode, label, icon }) => ({
          id: mode,
          label,
          icon,
        }));

  return (
    <Box
      position="fixed"
      top={topPosition}
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
        transition: 'top 0.2s ease-in-out, left 0.3s ease-in-out, right 0.3s ease-in-out, transform 0.3s ease-in-out',
      }}
    >
      <HStack 
        spacing={{ base: 0.5, md: 1 }}
        justify="center"
      >
        {/* Tool buttons */}
        {toolsToRender.map(({ id, icon: Icon, label }) => {
          const isDisabled = (() => {
            if (id === 'transformation' || id === 'edit') {
              return selectedPaths.length !== 1;
            }
            if (id === 'subpath') {
              if (selectedPaths.length !== 1) {
                return true;
              }
              const element = selectedPaths[0];
              if (!element || element.type !== 'path') {
                return true;
              }
              const pathData = element.data as import('../../types').PathData;
              return pathData.subPaths.length <= 1;
            }
            return false;
          })();
          return (
            <IconButton
              key={id}
              aria-label={label}
              icon={<Icon size={14} />}
              onClick={() => onModeChange(id)}
              size="xs"
              variant={activeMode === id ? 'solid' : 'ghost'}
              colorScheme={activeMode === id ? 'blue' : 'gray'}
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
