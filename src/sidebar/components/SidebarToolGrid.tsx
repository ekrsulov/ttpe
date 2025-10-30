import React from 'react';
import { Box, SimpleGrid } from '@chakra-ui/react';
import { RenderCountBadgeWrapper } from '../../components/ui/RenderCountBadgeWrapper';
import { SidebarUtilityButton } from '../../components/ui/SidebarUtilityButton';

interface ToolConfig {
  name: string;
  label: string;
}

interface SidebarToolGridProps {
  activePlugin: string | null;
  setMode: (mode: string) => void;
  onToolClick?: (toolName: string) => void;
  showFilePanel?: boolean;
  showSettingsPanel?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  isDesktop?: boolean;
}

/**
 * Grid component for plugin/tool buttons in the sidebar
 * Note: Main action tools (select, pencil, text, shape, subpath, transform, edit)
 * are now in the ActionBar at the bottom of the screen
 */
export const SidebarToolGrid: React.FC<SidebarToolGridProps> = ({ 
  activePlugin, 
  setMode,
  onToolClick,
  showFilePanel = false,
  showSettingsPanel = false,
  isPinned = false,
  onTogglePin,
  isDesktop = false
}) => {
  // Plugin configuration - only utility/settings tools
  // Main action tools moved to ActionBar
  const pluginRows: ToolConfig[][] = [
    [
      { name: 'file', label: 'File' },
      { name: 'settings', label: 'Settings' },
    ],
  ];

  const renderPluginButton = (plugin: ToolConfig) => {
    // Handle special panel buttons
    const handleClick = () => {
      if (onToolClick) {
        onToolClick(plugin.name);
      } else {
        setMode(plugin.name);
      }
    };

    // Determine if button should be active
    let isActive = false;
    
    // Special panel mode logic
    if (showFilePanel) {
      // In file mode, only file button is active
      isActive = plugin.name === 'file';
    } else if (showSettingsPanel) {
      // In settings mode, only settings button is active
      isActive = plugin.name === 'settings';
    } else {
      // Normal mode, check activePlugin
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
      onClick={onTogglePin!}
      fullWidth={false}
    />
  );

  return (
    <Box pt={2} pr={2} pl={2} bg="white" position="relative">
      <RenderCountBadgeWrapper componentName="SidebarToolGrid" position="top-left" />
      <SimpleGrid columns={isDesktop ? 3 : 2} spacing={1}>
        {pluginRows[0].map(renderPluginButton)}
        {isDesktop && renderPinButton()}
      </SimpleGrid>
    </Box>
  );
};