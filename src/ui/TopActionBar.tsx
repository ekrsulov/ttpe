import React from 'react';
import { HStack } from '@chakra-ui/react';
import { Menu } from 'lucide-react';
import { RenderCountBadgeWrapper } from './RenderCountBadgeWrapper';
import { FloatingToolbarShell } from './FloatingToolbarShell';
import { ToolbarIconButton } from './ToolbarIconButton';
import type { CanvasElement } from '../types';
import { TOOL_DEFINITIONS } from '../config/toolDefinitions';
import type { ToolMode } from '../config/toolDefinitions';
import { pluginManager } from '../utils/pluginManager';
import { useCanvasStore } from '../store/canvasStore';

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
  
  // Get grid state to conditionally show gridFill tool
  const gridEnabled = useCanvasStore(state => state.grid?.enabled ?? false);

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
    <FloatingToolbarShell
      toolbarPosition="top"
      sidebarWidth={sidebarWidth}
      showGridRulers={showGridRulers}
      sx={{
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
              const pathData = element.data as import('../types').PathData;
              return pathData.subPaths.length <= 1;
            }
            return false;
          })();
          return (
            <ToolbarIconButton
              key={id}
              icon={Icon}
              label={label}
              onClick={() => onModeChange(id)}
              variant={activeMode === id ? 'solid' : 'ghost'}
              colorScheme={activeMode === id ? 'blue' : 'gray'}
              tooltip={label}
              isDisabled={isDisabled}
              showTooltip={true}
              title={label}
            />
          );
        })}
        
        {/* Hamburger menu button - al final */}
        {showMenuButton && (
          <ToolbarIconButton
            icon={Menu}
            label="Toggle sidebar"
            onClick={onMenuClick}
            variant={isSidebarOpen ? 'solid' : 'ghost'}
            colorScheme={isSidebarOpen ? 'blue' : 'gray'}
            tooltip="Toggle Menu"
            showTooltip={true}
            title="Toggle Menu"
          />
        )}
      </HStack>
      <RenderCountBadgeWrapper componentName="TopActionBar" position="top-right" />
    </FloatingToolbarShell>
  );
};
