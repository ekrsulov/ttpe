import React from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { EditorPanel } from './plugins/EditorPanel';
import { PanPanel } from './plugins/PanPanel';
import { TransformationPanel } from './plugins/TransformationPanel';
import { PencilPanel } from './plugins/PencilPanel';
import { TextPanel } from './plugins/TextPanel';
import { SelectPanel } from './plugins/SelectPanel';
import { ShapePanel } from './plugins/ShapePanel';
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
        backgroundColor: '#f9f9f9'
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
              <button
                key={plugin.name}
                onPointerUp={() => !isDisabled && setActivePlugin(activePlugin === plugin.name ? null : plugin.name)}
                style={{
                  padding: '4px',
                  backgroundColor: activePlugin === plugin.name ? '#007bff' : '#fff',
                  color: activePlugin === plugin.name ? '#fff' : isDisabled ? '#ccc' : '#333',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  minHeight: '28px',
                  opacity: isDisabled ? 0.5 : 1
                }}
                title={plugin.label}
                disabled={isDisabled}
              >
                <IconComponent size={16} />
              </button>
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
        paddingBottom: '140px' // Space for fixed SelectPanel
      }}>
        <EditorPanel />
        {activePlugin === 'pan' && <PanPanel />}
        {activePlugin === 'transformation' && <TransformationPanel />}
        {activePlugin === 'pencil' && <PencilPanel />}
        {activePlugin === 'text' && <TextPanel />}
        {activePlugin === 'shape' && <ShapePanel />}
      </div>

      {/* Fixed SelectPanel at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '8px',
        backgroundColor: 'rgba(249, 249, 249, 0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid #ddd',
        zIndex: 1001
      }}>
        <SelectPanel />
      </div>
    </div>
  );
};