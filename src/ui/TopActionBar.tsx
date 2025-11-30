import React, { useRef } from 'react';
import { HStack, Box } from '@chakra-ui/react';
import { Menu, MoreHorizontal } from 'lucide-react';
import { RenderCountBadgeWrapper } from './RenderCountBadgeWrapper';
import { FloatingToolbarShell } from './FloatingToolbarShell';
import { ToolbarIconButton } from './ToolbarIconButton';
import { pluginManager, useVisibleToolIds } from '../utils/pluginManager';
import { useCanvasStore } from '../store/canvasStore';
import { useDynamicTools, useEnabledPlugins, useResponsive, useSidebarLayout, useActiveToolColors } from '../hooks';
import { useAnimatedBackground } from '../hooks/useAnimatedBackground';

/**
 * TopActionBar - Main toolbar for tool selection
 * Gets all state from store directly (no props drilling)
 */
export const TopActionBar: React.FC = () => {
  // Get sidebar layout state using consolidated hook
  const { effectiveSidebarWidth, isSidebarPinned, isSidebarOpen } = useSidebarLayout();
  
  // Get other state from store
  const activeMode = useCanvasStore(state => state.activePlugin);
  const setMode = useCanvasStore(state => state.setMode);
  const openSidebar = useCanvasStore(state => state.openSidebar);
  const grid = useCanvasStore(state => state.grid);
  const guidelines = useCanvasStore(state => state.guidelines);
  const isDraggingElements = useCanvasStore(state => state.isDraggingElements);

  // Calculated values
  const showGridRulers = (grid?.enabled && grid?.showRulers) || (guidelines?.enabled && guidelines?.manualGuidesEnabled);
  const showMenuButton = !isSidebarPinned;

  // Use unified responsive hook
  const { isMobile } = useResponsive();

  // Dynamic tools hook
  const {
    trackToolUsage,
    getMobileVisibleTools,
    getExtraTools,
    showExtraTools,
    toggleExtraTools,
    alwaysShownTools,
  } = useDynamicTools(activeMode);

  // Colors for active buttons - use centralized hook
  const { activeBg, activeColor } = useActiveToolColors();

  // Subscribe to visible tool IDs
  const visibleToolIds = useVisibleToolIds();

  // Subscribe to enabledPlugins to trigger re-render when plugins are toggled
  useEnabledPlugins();

  // Ref for extra tools bar click outside handling
  const extraToolsBarRef = useRef<HTMLDivElement>(null);

  // Get visible registered tools using plugin-defined visibility
  const registeredTools = React.useMemo(() => {
    return pluginManager
      .getRegisteredTools()
      .filter((plugin) => plugin.toolDefinition !== undefined)
      .filter((plugin) => visibleToolIds.includes(plugin.id))
      .map((plugin) => {
        const Icon = plugin.metadata.icon ?? Menu;

        return {
          id: plugin.id,
          label: plugin.metadata.label ?? plugin.id,
          icon: Icon,
          order: plugin.toolDefinition?.order ?? 999,
        };
      })
      .sort((a, b) => a.order - b.order);
  }, [visibleToolIds]);

  // Filter tools based on mobile/desktop and usage patterns
  const toolsToRender = React.useMemo(() => {
    const baseTools = registeredTools.length
      ? registeredTools
      : pluginManager.getToolDefinitions()
        .filter((def) => visibleToolIds.includes(def.mode))
        .sort((a, b) => a.order - b.order)
        .map(({ mode, label, icon }) => ({
          id: mode,
          label,
          icon,
        }));

    if (isMobile) {
      const visibleDynamicTools = getMobileVisibleTools();
      const allowedTools = [...alwaysShownTools, ...visibleDynamicTools];
      return baseTools.filter(tool => allowedTools.includes(tool.id));
    }

    return baseTools;
  }, [registeredTools, visibleToolIds, isMobile, getMobileVisibleTools, alwaysShownTools]);

  // Get extra tools for mobile overflow menu
  const extraTools = React.useMemo(() => {
    if (!isMobile) return [];

    const toolDefinitions = pluginManager.getToolDefinitions();
    return getExtraTools()
      .map(toolId => {
        const toolDef = toolDefinitions.find(def => def.mode === toolId);
        if (!toolDef) return null;
        if (!visibleToolIds.includes(toolId)) return null;

        return {
          id: toolId,
          label: toolDef.label,
          icon: toolDef.icon ?? Menu,
        };
      })
      .filter(Boolean) as Array<{ id: string, label: string, icon: React.ComponentType<{ size?: number }> }>;
  }, [isMobile, getExtraTools, visibleToolIds]);

  // Create stable dependency array for background animation
  const toolIds = toolsToRender.map(t => t.id);
  const animationDeps = [...toolIds, String(showExtraTools)];

  // Use animated background hook
  const { backgroundStyle, setButtonRef } = useAnimatedBackground(activeMode, animationDeps);

  // Handle mode change with usage tracking
  const handleModeChange = React.useCallback((mode: string) => {
    trackToolUsage(mode);

    const extraToolIds = extraTools.map(tool => tool.id);
    if (extraToolIds.includes(mode)) {
      toggleExtraTools();
    }

    setMode(mode);
  }, [setMode, trackToolUsage, extraTools, toggleExtraTools]);

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
        sidebarWidth={effectiveSidebarWidth}
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
            const store = useCanvasStore.getState();
            const isDisabled = isDraggingElements ? false : pluginManager.isToolDisabled(id, store);
            return (
              <Box
                key={id}
                ref={setButtonRef(id)}
                position="relative"
                zIndex={1}
              >
                <ToolbarIconButton
                  icon={Icon ?? Menu}
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
              ref={setButtonRef('more')}
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

          {/* Hamburger menu button */}
          {showMenuButton && (
            <Box
              ref={setButtonRef('menu')}
              position="relative"
              zIndex={1}
            >
              <ToolbarIconButton
                icon={Menu}
                label="Toggle sidebar"
                onClick={openSidebar}
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
            sidebarWidth={effectiveSidebarWidth}
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
                const store = useCanvasStore.getState();
                const isDisabled = isDraggingElements ? false : pluginManager.isToolDisabled(id, store);

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
