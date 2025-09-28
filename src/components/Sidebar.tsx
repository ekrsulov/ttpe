import React, { useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { EditorPanel } from './plugins/EditorPanel';
import { EditPanel } from './plugins/EditPanel';
import { ArrangePanel } from './plugins/ArrangePanel';
import { PanPanel } from './plugins/PanPanel';
import { TransformationPanel } from './plugins/TransformationPanel';
import { TextPanel } from './plugins/TextPanel';
import { SelectPanel } from './plugins/SelectPanel';
import { ShapePanel } from './plugins/ShapePanel';
import { PencilPanel } from './plugins/PencilPanel';
import { ControlPointAlignmentPanel } from './plugins/ControlPointAlignmentPanel';
import { OpticalAlignmentPanel } from './plugins/OpticalAlignmentPanel';
import { FilePanel } from './plugins/FilePanel';
import { SettingsPanel } from './plugins/SettingsPanel';
import { IconButton } from './ui/IconButton';
import {
  Hand,
  Pen,
  Type,
  MousePointer,
  Shapes,
  VectorSquare,
  MousePointerClick,
  ChevronUp,
  ChevronDown,
  Route,
  File,
  Settings
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activePlugin,
    setMode,
    selectedIds,
    smoothBrush,
    selectedCommands,
    updateSmoothBrush,
    applySmoothBrush,
    activateSmoothBrush,
    deactivateSmoothBrush
  } = useCanvasStore();
  const [isArrangeExpanded, setIsArrangeExpanded] = useState(false);
  const [showFilePanel, setShowFilePanel] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  const plugins = [
    { name: 'select', label: 'Select', icon: MousePointer },
    { name: 'subpath', label: 'Subpath', icon: Route },
    { name: 'transformation', label: 'Transform', icon: VectorSquare },
    { name: 'edit', label: 'Edit', icon: MousePointerClick },
    { name: 'pan', label: 'Pan', icon: Hand },
    { name: 'pencil', label: 'Pencil', icon: Pen },
    { name: 'text', label: 'Text', icon: Type },
    { name: 'shape', label: 'Shape', icon: Shapes },
  ];

  // Helper function to render plugin buttons
  const renderPluginButton = (plugin: typeof plugins[0]) => {
    const IconComponent = plugin.icon;
    const isDisabled = (plugin.name === 'transformation' || plugin.name === 'edit' || plugin.name === 'subpath') && selectedIds.length === 0;
    
    // Special handling for file and settings buttons
    if (plugin.name === 'file') {
      return (
        <IconButton
          key={plugin.name}
          onPointerUp={() => setShowFilePanel(!showFilePanel)}
          active={showFilePanel}
          activeBgColor="#007bff"
          activeColor="#fff"
          size="custom"
          customSize="30px"
          title={plugin.label}
        >
          <IconComponent size={14} />
        </IconButton>
      );
    }
    
    if (plugin.name === 'settings') {
      return (
        <IconButton
          key={plugin.name}
          onPointerUp={() => setShowConfigPanel(!showConfigPanel)}
          active={showConfigPanel}
          activeBgColor="#007bff"
          activeColor="#fff"
          size="custom"
          customSize="30px"
          title={plugin.label}
        >
          <IconComponent size={14} />
        </IconButton>
      );
    }
    
    return (
      <IconButton
        key={plugin.name}
        onPointerUp={() => !isDisabled && setMode(plugin.name)}
        disabled={isDisabled}
        active={activePlugin === plugin.name}
        activeBgColor="#007bff"
        activeColor="#fff"
        size="custom"
        customSize="30px"
        title={plugin.label}
      >
        <IconComponent size={14} />
      </IconButton>
    );
  };

  // Create rows with 5 buttons each
  const pluginRows = [
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

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: '250px',
      height: '100vh',
      backgroundColor: 'rgba(249, 249, 249, 0.95)',
      backdropFilter: 'blur(10px)',
      borderLeft: '1px solid #ccc',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Fixed tools section */}
      <div style={{
        padding: '4px 8px 4px 8px',
        backgroundColor: '#fff'
      }}>
        {/* Plugin button grid */}
        {pluginRows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '2px',
              marginBottom: rowIndex < pluginRows.length - 1 ? '2px' : '0'
            }}
          >
            {row.map(renderPluginButton)}
          </div>
        ))}
      </div>

      {/* Scrollable panels section */}
      <div style={{
        flex: 1,
        padding: '0px 8px 8px 8px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: '#fff'
      }}>
        <EditorPanel />
        {showFilePanel && <FilePanel />}
        {showConfigPanel && <SettingsPanel />}
        {activePlugin === 'edit' && (
          <EditPanel
            activePlugin={activePlugin}
            smoothBrush={smoothBrush}
            selectedCommands={selectedCommands}
            updateSmoothBrush={updateSmoothBrush}
            applySmoothBrush={applySmoothBrush}
            activateSmoothBrush={activateSmoothBrush}
            deactivateSmoothBrush={deactivateSmoothBrush}
          />
        )}
        {activePlugin === 'edit' && <ControlPointAlignmentPanel />}
        {activePlugin === 'select' && <OpticalAlignmentPanel />}
        {activePlugin === 'pan' && <PanPanel />}
        {activePlugin === 'pencil' && <PencilPanel />}
        {activePlugin === 'transformation' && <TransformationPanel />}
        {activePlugin === 'text' && <TextPanel />}
        {activePlugin === 'shape' && <ShapePanel />}
      </div>

      {/* Fixed SelectPanel at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {isArrangeExpanded && <ArrangePanel />}

        {/* Expand/Collapse Chevron for Arrange */}
        <div style={{ position: 'relative', margin: '4px 0' }}>
          {/* Horizontal line */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '1px',
            backgroundColor: '#dee2e6',
            zIndex: 1
          }} />

          {/* Circular button in the center */}
          <div style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2
          }}>
            <div
              onClick={() => setIsArrangeExpanded(!isArrangeExpanded)}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                border: '1px solid #dee2e6',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={isArrangeExpanded ? "Collapse Arrange" : "Expand Arrange"}
            >
              {isArrangeExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </div>
          </div>
        </div>

        <SelectPanel />
      </div>
    </div>
  );
};