import React, { useRef, useEffect, useState } from 'react';
import { HStack, Box, useColorModeValue } from '@chakra-ui/react';
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
  
  // Colors for active buttons
  const activeBg = useColorModeValue('gray.800', 'gray.200');
  const activeColor = useColorModeValue('white', 'gray.900');
  
  // Get grid state to conditionally show gridFill tool
  const gridEnabled = useCanvasStore(state => state.grid?.enabled ?? false);

  // State and refs for animated background
  const buttonRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [backgroundStyle, setBackgroundStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  }>({ left: 0, width: 0, opacity: 0 });

  // Update background position when active mode changes
  useEffect(() => {
    if (activeMode && buttonRefs.current.has(activeMode)) {
      const buttonElement = buttonRefs.current.get(activeMode);
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const parentRect = buttonElement.parentElement?.getBoundingClientRect();
        if (parentRect) {
          setBackgroundStyle({
            left: rect.left - parentRect.left,
            width: rect.width,
            opacity: 1,
          });
        }
      }
    } else {
      setBackgroundStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [activeMode]);

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
        spacing={{ base: 0, md: 0 }}
        justify="center"
        position="relative"
      >
        {/* Animated background */}
        <Box
          position="absolute"
          top="50%"
          transform="translateY(-50%)"
          left={`${backgroundStyle.left}px`}
          width={`${backgroundStyle.width}px`}
          height="28px"
          bg={activeBg}
          borderRadius="full"
          opacity={backgroundStyle.opacity}
          transition="left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-in-out"
          pointerEvents="none"
          zIndex={0}
        />
        
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
            <Box
              key={id}
              ref={(el) => {
                if (el) {
                  buttonRefs.current.set(id, el);
                } else {
                  buttonRefs.current.delete(id);
                }
              }}
              position="relative"
              zIndex={1}
            >
              <ToolbarIconButton
                icon={Icon}
                label={label}
                onClick={() => onModeChange(id)}
                variant="ghost"
                colorScheme="gray"
                bg={activeMode === id ? 'transparent' : undefined}
                color={activeMode === id ? activeColor : undefined}
                _hover={activeMode === id ? { bg: 'transparent' } : undefined}
                tooltip={label}
                isDisabled={isDisabled}
                showTooltip={true}
                title={label}
              />
            </Box>
          );
        })}
        
        {/* Hamburger menu button - al final */}
        {showMenuButton && (
          <Box
            ref={(el) => {
              if (el) {
                buttonRefs.current.set('menu', el);
              } else {
                buttonRefs.current.delete('menu');
              }
            }}
            position="relative"
            zIndex={1}
          >
            <ToolbarIconButton
              icon={Menu}
              label="Toggle sidebar"
              onClick={onMenuClick}
              variant="ghost"
              colorScheme="gray"
              bg={isSidebarOpen ? 'transparent' : undefined}
              color={isSidebarOpen ? activeColor : undefined}
              _hover={isSidebarOpen ? { bg: 'transparent' } : undefined}
              tooltip="Toggle Menu"
              showTooltip={true}
              title="Toggle Menu"
            />
          </Box>
        )}
      </HStack>
      <RenderCountBadgeWrapper componentName="TopActionBar" position="top-right" />
    </FloatingToolbarShell>
  );
};
