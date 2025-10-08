import React from 'react';
import { Box, SimpleGrid, Button } from '@chakra-ui/react';
import { RenderCountBadgeWrapper } from '../ui/RenderCountBadgeWrapper';

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
      <Button
        key={plugin.name}
        aria-label={plugin.label}
        onClick={handleClick}
        variant="unstyled"
        size="sm"
        data-active={isActive}
        bg={isActive ? 'blue.500' : 'transparent'}
        color={isActive ? 'white' : 'gray.700'}
        border="1px solid"
        borderColor={isActive ? 'blue.500' : 'gray.400'}
        borderRadius="md"
        fontWeight="medium"
        transition="all 0.2s"
        width={!isDesktop ? "full" : "auto"}
        _hover={{
          bg: isActive ? 'blue.600' : 'gray.50'
        }}
        sx={{
          minH: '32px',
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {plugin.label}
      </Button>
    );
  };

  const renderPinButton = () => (
    <Button
      aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
      onClick={onTogglePin}
      variant="unstyled"
      size="sm"
      bg="transparent"
      color="gray.700"
      border="1px solid"
      borderColor="gray.400"
      borderRadius="md"
      fontWeight="medium"
      transition="all 0.2s"
      _hover={{
        bg: 'gray.50'
      }}
      sx={{
        minH: '32px',
        px: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isPinned ? "Unpin" : "Pin"}
    </Button>
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