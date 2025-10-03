import React from 'react';
import { Box, SimpleGrid, IconButton as ChakraIconButton, Tooltip } from '@chakra-ui/react';
import {
  Hand,
  Pen,
  Type,
  MousePointer,
  Shapes,
  VectorSquare,
  MousePointerClick,
  Route,
  File,
  Settings
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
}

/**
 * Grid component for plugin/tool buttons in the sidebar
 */
export const SidebarToolGrid: React.FC<SidebarToolGridProps> = ({ 
  activePlugin, 
  setMode,
  onToolClick,
  showFilePanel = false,
  showSettingsPanel = false
}) => {
  // Plugin configuration organized in rows
  const pluginRows: ToolConfig[][] = [
    [
      { name: 'select', label: 'Select', icon: MousePointer },
      { name: 'subpath', label: 'Subpath', icon: Route },
      { name: 'transformation', label: 'Transform', icon: VectorSquare },
      { name: 'edit', label: 'Edit', icon: MousePointerClick },
      { name: 'file', label: 'File', icon: File },
      { name: 'pan', label: 'Pan', icon: Hand },
      { name: 'pencil', label: 'Pencil', icon: Pen },
      { name: 'text', label: 'Text', icon: Type },
      { name: 'shape', label: 'Shape', icon: Shapes },
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
          icon={<IconComponent size={16} />}
          onClick={handleClick}
          variant="tool"
          size="md"
          data-active={isActive}
          bg={isActive ? 'brand.500' : 'sidebar.toolBg'}
          color={isActive ? 'white' : 'gray.700'}
          _hover={{
            bg: isActive ? 'brand.600' : 'sidebar.toolHover'
          }}
        />
      </Tooltip>
    );
  };

  return (
    <Box p={2} bg="white">
      {pluginRows.map((row, rowIndex) => (
        <SimpleGrid
          key={rowIndex}
          columns={5}
          spacing={0.5}
          mb={rowIndex < pluginRows.length - 1 ? 0.5 : 0}
        >
          {row.map(renderPluginButton)}
        </SimpleGrid>
      ))}
    </Box>
  );
};