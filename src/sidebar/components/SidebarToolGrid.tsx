import React from 'react';
import { Box, SimpleGrid } from '@chakra-ui/react';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { SidebarUtilityButton } from '../../ui/SidebarUtilityButton';
import { useSidebarContext } from '../../contexts/SidebarContext';

interface ToolConfig {
  name: string;
  label: string;
}

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

  // Plugin configuration - only utility/settings tools
  const pluginRows: ToolConfig[][] = [
    [
      { name: 'file', label: 'File' },
      { name: 'settings', label: 'Settings' },
    ],
  ];

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
    
    return (
      <SidebarUtilityButton
        key={plugin.name}
        label={plugin.label}
        isActive={isActive}
        onClick={handleClick}
        fullWidth={!isDesktop}
      />
    );
  };

  const renderPinButton = () => (
    <SidebarUtilityButton
      label={isPinned ? 'Unpin' : 'Pin'}
      isActive={false}
      onClick={onTogglePin}
      fullWidth={false}
    />
  );

  return (
    <Box pt={2} pr={2} pl={2} bg="surface.panel" position="relative">
      <RenderCountBadgeWrapper componentName="SidebarToolGrid" position="top-left" />
      <SimpleGrid columns={isDesktop ? 3 : 2} spacing={2}>
        {pluginRows[0].map(renderPluginButton)}
        {isDesktop && renderPinButton()}
      </SimpleGrid>
    </Box>
  );
};