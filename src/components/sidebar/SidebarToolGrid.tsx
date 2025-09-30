import React from 'react';
import { IconButton } from '../ui/IconButton';
import { PANEL_STYLES } from '../ui/PanelComponents';
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
    ],
    [
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
      <IconButton
        key={plugin.name}
        onClick={handleClick}
        active={isActive}
        title={plugin.label}
        size="custom"
        customSize="36px"
        activeBgColor="#007bff"
      >
        <IconComponent size={16} />
      </IconButton>
    );
  };

  return (
    <div style={PANEL_STYLES.toolsSection}>
      {pluginRows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            ...PANEL_STYLES.pluginGrid,
            marginBottom: rowIndex < pluginRows.length - 1 ? '2px' : '0'
          }}
        >
          {row.map(renderPluginButton)}
        </div>
      ))}
    </div>
  );
};