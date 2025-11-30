import React from 'react';
import { Box, HStack } from '@chakra-ui/react';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { SidebarUtilityButton } from '../../ui/SidebarUtilityButton';
import { useSidebarContext } from '../../contexts/SidebarContext';

interface ToolConfig {
  name: string;
  label: string;
}

// Plugin configuration - only utility/settings tools
const UTILITY_TOOLS: ToolConfig[] = [
  { name: 'file', label: 'File' },
  { name: 'settings', label: 'Settings' },
];

/**
 * Grid component for plugin/tool buttons in the sidebar
 * Note: Main action tools (select, pencil, text, shape, subpath, transform, edit)
 * are now in the ActionBar at the bottom of the screen
 */
export const SidebarToolGrid: React.FC = () => {
  // Get values from context
  const {
    activePlugin,
    showFilePanel,
    showSettingsPanel,
    isPinned,
    isDesktop,
    onToolClick,
    onTogglePin,
  } = useSidebarContext();

  const renderPluginButton = (plugin: ToolConfig) => {
    const handleClick = () => {
      onToolClick(plugin.name);
    };

    // Determine if button should be active
    let isActive = false;
    
    if (showFilePanel) {
      isActive = plugin.name === 'file';
    } else if (showSettingsPanel) {
      isActive = plugin.name === 'settings';
    } else {
      isActive = activePlugin === plugin.name;
    }

    // Flex values: File=2, Settings=2, Unpin=1 (small)
    const flexValue = plugin.name === 'file' || plugin.name === 'settings' ? 2 : 1;
    
    return (
      <SidebarUtilityButton
        key={plugin.name}
        label={plugin.label}
        isActive={isActive}
        onClick={handleClick}
        fullWidth={!isDesktop}
        flex={flexValue}
      />
    );
  };

  return (
    <Box pt={2} pr={2} pl={2} bg="surface.panel" position="relative">
      <RenderCountBadgeWrapper componentName="SidebarToolGrid" position="top-left" />
      <HStack spacing={2} w="full">
        {UTILITY_TOOLS.map(renderPluginButton)}
        {isDesktop && (
          <SidebarUtilityButton
            label={isPinned ? 'Unpin' : 'Pin'}
            isActive={false}
            onClick={onTogglePin}
            flex={1}
          />
        )}
      </HStack>
    </Box>
  );
};