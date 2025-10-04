import React from 'react';
import { Box, SimpleGrid, IconButton as ChakraIconButton, Tooltip } from '@chakra-ui/react';
import {
  Hand,
  File,
  Settings,
  Pin,
  PinOff
} from 'lucide-react';

interface ToolConfig {
  name: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
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
      { name: 'file', label: 'File', icon: File },
      { name: 'pan', label: 'Pan', icon: Hand },
      { name: 'settings', label: 'Settings', icon: Settings },
    ],
  ];

  const renderPluginButton = (plugin: ToolConfig) => {
    const IconComponent = plugin.icon;
    
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
      <Tooltip key={plugin.name} label={plugin.label} placement="left" hasArrow>
        <ChakraIconButton
          aria-label={plugin.label}
          icon={<IconComponent size={14} />}
          onClick={handleClick}
          variant="tool"
          size="sm"
          data-active={isActive}
          bg={isActive ? 'brand.500' : 'transparent'}
          color={isActive ? 'white' : 'gray.700'}
          _hover={{
            bg: isActive ? 'brand.600' : 'gray.50'
          }}
          sx={{
            minH: '32px',
            minW: '32px',
          }}
        />
      </Tooltip>
    );
  };

  return (
    <Box pt={2} pr={2} pl={2} bg="white">
      {pluginRows.map((row, rowIndex) => (
        <SimpleGrid
          key={rowIndex}
          columns={isDesktop ? 4 : 3} // 4 columns on desktop (includes pin), 3 on mobile
          spacing={1}
          mb={rowIndex === 0 ? 1 : (rowIndex < pluginRows.length - 1 ? 1 : 0)}
        >
          {row.map(renderPluginButton)}
          
          {/* Pin/Unpin button - only on desktop */}
          {isDesktop && rowIndex === 0 && (
            <Tooltip label={isPinned ? "Unpin sidebar" : "Pin sidebar"} placement="left" hasArrow>
              <ChakraIconButton
                aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
                icon={isPinned ? <Pin size={14} /> : <PinOff size={14} />}
                onClick={onTogglePin}
                variant="tool"
                size="sm"
                bg="transparent"
                color="gray.700"
                _hover={{
                  bg: 'gray.50'
                }}
                sx={{
                  minH: '32px',
                  minW: '32px',
                }}
              />
            </Tooltip>
          )}
        </SimpleGrid>
      ))}
    </Box>
  );
};