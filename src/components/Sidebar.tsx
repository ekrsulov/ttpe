import React, { useState } from 'react';
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
  Hand,
  Pen,
  Type,
  MousePointer,
  Shapes,
  VectorSquare,
  MousePointerClick,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activePlugin, setMode, selectedIds } = useCanvasStore();
  const [isArrangeExpanded, setIsArrangeExpanded] = useState(false);

  const plugins = [
    { name: 'select', label: 'Select', icon: MousePointer },
    { name: 'pan', label: 'Pan', icon: Hand },
    { name: 'edit', label: 'Edit', icon: MousePointerClick },
    { name: 'transformation', label: 'Transform', icon: VectorSquare },
    { name: 'pencil', label: 'Pencil', icon: Pen },
    { name: 'text', label: 'Text', icon: Type },
    { name: 'shape', label: 'Shape', icon: Shapes },
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
        padding: '4px 8px 0px 8px',
        backgroundColor: '#fff'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px'
        }}>
          {plugins.map((plugin) => {
            const IconComponent = plugin.icon;
            const isDisabled = (plugin.name === 'transformation' || plugin.name === 'edit') && selectedIds.length === 0;
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
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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