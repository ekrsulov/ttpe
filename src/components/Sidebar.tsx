import React from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { EditorPanel } from './plugins/EditorPanel';
import { ArrangePanel } from './plugins/ArrangePanel';
import { PanPanel } from './plugins/PanPanel';
import { TransformationPanel } from './plugins/TransformationPanel';
import { TextPanel } from './plugins/TextPanel';
import { SelectPanel } from './plugins/SelectPanel';
import { ShapePanel } from './plugins/ShapePanel';
import { IconButton } from './ui/IconButton';
import {
  Move,
  Pen,
  Type,
  MousePointer,
  Shapes,
  RotateCcw,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activePlugin, setActivePlugin, selectedIds } = useCanvasStore();

  const plugins = [
    { name: 'select', label: 'Select', icon: MousePointer },
    { name: 'pan', label: 'Pan', icon: Move },
    { name: 'pencil', label: 'Pencil', icon: Pen },
    { name: 'text', label: 'Text', icon: Type },
    { name: 'shape', label: 'Shape', icon: Shapes },
    { name: 'transformation', label: 'Transform', icon: RotateCcw },
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
        padding: '4px',
        borderBottom: '1px solid #ddd',
        backgroundColor: '#fff'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '2px'
        }}>
          {plugins.map((plugin) => {
            const IconComponent = plugin.icon;
            const isDisabled = plugin.name === 'transformation' && selectedIds.length === 0;
            return (
              <IconButton
                key={plugin.name}
                onPointerUp={() => !isDisabled && setActivePlugin(activePlugin === plugin.name ? null : plugin.name)}
                disabled={isDisabled}
                active={activePlugin === plugin.name}
                activeBgColor="#007bff"
                activeColor="#fff"
                borderColor="#ccc"
                size="custom"
                customSize="32px"
                title={plugin.label}
              >
                <IconComponent size={14} />
              </IconButton>
            );
          })}
        </div>
      </div>

      {/* Scrollable panels section */}
      <div style={{
        flex: 1,
        padding: '8px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: '#fff'
      }}>
        <EditorPanel />
        {activePlugin === 'pan' && <PanPanel />}
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
        <ArrangePanel />
        <SelectPanel />
      </div>
    </div>
  );
};