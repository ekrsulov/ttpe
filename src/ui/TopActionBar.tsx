import React, { useRef, useLayoutEffect, useState } from 'react';
import { HStack, Box, useColorModeValue, useBreakpointValue } from '@chakra-ui/react';
import { Menu, MoreHorizontal } from 'lucide-react';
import { RenderCountBadgeWrapper } from './RenderCountBadgeWrapper';
import { FloatingToolbarShell } from './FloatingToolbarShell';
import { ToolbarIconButton } from './ToolbarIconButton';
import type { CanvasElement } from '../types';
import { TOOL_DEFINITIONS } from '../config/toolDefinitions';
import type { ToolMode } from '../config/toolDefinitions';
import { pluginManager } from '../utils/pluginManager';
import { useCanvasStore } from '../store/canvasStore';
import { useDynamicTools } from '../hooks/useDynamicTools';

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
  
  // Detect mobile breakpoint
  const isMobile = useBreakpointValue({ base: true, md: false }, { fallback: 'md' });
  
  // Get grid state to conditionally show gridFill tool
  const gridEnabled = useCanvasStore(state => state.grid?.enabled ?? false);
  
  // Dynamic tools hook
  const {
    trackToolUsage,
    getMobileVisibleTools,
    getExtraTools,
    showExtraTools,
    toggleExtraTools,
    alwaysShownTools,
  } = useDynamicTools(activeMode, gridEnabled);
  
  // Colors for active buttons
  const activeBg = useColorModeValue('gray.800', 'gray.200');
  const activeColor = useColorModeValue('white', 'gray.900');
  
  // Optimize subscriptions - only subscribe to length/count, not entire arrays
  // This prevents re-renders when elements data changes (e.g., during movement)
  const selectedIdsCount = useCanvasStore(state => state.selectedIds.length);
  const elementsCount = useCanvasStore(state => state.elements.length);
  const isDraggingElements = useCanvasStore(state => state.isDraggingElements);
  
  // Memoize element lookups to avoid recalculating on every render
  const disabledStates = React.useMemo(() => {
    // Skip expensive calculations during dragging
    if (isDraggingElements) {
      return {
        transformation: false,
        edit: false,
        subpath: false,
      };
    }
    
    const state = useCanvasStore.getState();
    const { selectedIds, elements } = state;
    
    const transformationDisabled = (() => {
      if (selectedIds.length === 0) return true;
      if (selectedIds.length === 1) {
        const element = elements.find(el => el.id === selectedIds[0]);
        return !element || (element.type !== 'path' && element.type !== 'group');
      }
      return false;
    })();
    
    const editDisabled = selectedPaths.length !== 1;
    
    const subpathDisabled = (() => {
      if (selectedPaths.length !== 1) return true;
      const element = selectedPaths[0];
      if (!element || element.type !== 'path') return true;
      const pathData = element.data as import('../types').PathData;
      return pathData.subPaths.length <= 1;
    })();
    
    return {
      transformation: transformationDisabled,
      edit: editDisabled,
      subpath: subpathDisabled,
    };
  }, [selectedIdsCount, elementsCount, selectedPaths, isDraggingElements]); // eslint-disable-line react-hooks/exhaustive-deps

  // State and refs for animated background
  const buttonRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const extraToolsBarRef = useRef<HTMLDivElement>(null);
  const [backgroundStyle, setBackgroundStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  }>({ left: 0, width: 0, opacity: 0 });

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

  // Filter tools based on mobile/desktop and usage patterns
  const toolsToRender = React.useMemo(() => {
    // Get base tools list
    const baseTools = registeredTools.length
      ? registeredTools
      : TOOL_DEFINITIONS
          .filter((def) => def.mode !== 'gridFill' || gridEnabled)
          .sort((a, b) => a.order - b.order)
          .map(({ mode, label, icon }) => ({
            id: mode,
            label,
            icon,
          }));

    if (isMobile) {
      // On mobile, show always shown tools + dynamic tools based on usage
      const visibleDynamicTools = getMobileVisibleTools();
      const allowedTools = [...alwaysShownTools, ...visibleDynamicTools];
      
      return baseTools.filter(tool => allowedTools.includes(tool.id as ToolMode));
    }

    // On desktop, show all tools
    return baseTools;
  }, [registeredTools, gridEnabled, isMobile, getMobileVisibleTools, alwaysShownTools]);

  // Get extra tools for mobile overflow menu
  const extraTools = React.useMemo(() => {
    if (!isMobile) return [];
    
    return getExtraTools()
      .map(toolId => {
        const toolDef = TOOL_DEFINITIONS.find(def => def.mode === toolId);
        if (!toolDef) return null;
        
        return {
          id: toolId,
          label: toolDef.label,
          icon: toolDef.icon,
        };
      })
      .filter(Boolean) as Array<{id: string, label: string, icon: React.ComponentType<{ size?: number }>}>;
  }, [isMobile, getExtraTools]);

  // Create stable dependency from tool IDs
  const toolIds = toolsToRender.map(t => t.id).join(',');

  // Update background position when active mode changes or tools visibility changes
  // Using useLayoutEffect to ensure buttons are in DOM before measuring
  useLayoutEffect(() => {
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
  }, [activeMode, showExtraTools, toolIds]);

  // Handle mode change with usage tracking
  const handleModeChange = React.useCallback((mode: string) => {
    // Track tool usage for dynamic selection
    trackToolUsage(mode as ToolMode);
    
    // Close extra tools bar if a tool from it was selected
    const extraToolIds = extraTools.map(tool => tool.id);
    if (extraToolIds.includes(mode)) {
      toggleExtraTools();
    }
    
    onModeChange(mode);
  }, [onModeChange, trackToolUsage, extraTools, toggleExtraTools]);

  // Handle click outside to close extra tools bar
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showExtraTools &&
        extraToolsBarRef.current &&
        !extraToolsBarRef.current.contains(event.target as Node)
      ) {
        toggleExtraTools();
      }
    };

    if (showExtraTools) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showExtraTools, toggleExtraTools]);

  return (
    <>
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
          height="32px"
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
            if (id === 'transformation') {
              return disabledStates.transformation;
            }
            if (id === 'edit') {
              return disabledStates.edit;
            }
            if (id === 'subpath') {
              return disabledStates.subpath;
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
                onClick={() => handleModeChange(id)}
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
        
        {/* Three dots button for mobile extra tools */}
        {isMobile && extraTools.length > 0 && (
          <Box
            ref={(el) => {
              if (el) {
                buttonRefs.current.set('more', el);
              } else {
                buttonRefs.current.delete('more');
              }
            }}
            position="relative"
            zIndex={1}
          >
            <ToolbarIconButton
              icon={MoreHorizontal}
              label="More tools"
              onClick={toggleExtraTools}
              variant="ghost"
              colorScheme="gray"
              bg={showExtraTools ? 'transparent' : undefined}
              color={showExtraTools ? activeColor : undefined}
              _hover={showExtraTools ? { bg: 'transparent' } : undefined}
              tooltip="More tools"
              showTooltip={true}
              title="More tools"
            />
          </Box>
        )}
        
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
    
    {/* Extra tools bar */}
    {showExtraTools && extraTools.length > 0 && (
      <Box ref={extraToolsBarRef}>
        <FloatingToolbarShell
          toolbarPosition="top"
          sidebarWidth={sidebarWidth}
          showGridRulers={showGridRulers}
          sx={{
            marginTop: '42px',
            transition: 'all 0.2s ease-in-out',
          }}
        >
        <HStack 
          spacing={{ base: 0, md: 0 }}
          justify="center"
          position="relative"
        >
          {extraTools.map(({ id, icon: Icon, label }) => {
            const isDisabled = (() => {
              if (id === 'transformation') {
                return disabledStates.transformation;
              }
              if (id === 'edit') {
                return disabledStates.edit;
              }
              if (id === 'subpath') {
                return disabledStates.subpath;
              }
              return false;
            })();
            
            return (
              <Box
                key={id}
                position="relative"
                zIndex={1}
              >
                <ToolbarIconButton
                  icon={Icon}
                  label={label}
                  onClick={() => handleModeChange(id)}
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
        </HStack>
      </FloatingToolbarShell>
      </Box>
    )}
    </>
  );
};
