import React from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { PanPanel } from './plugins/PanPanel';
import { ZoomPanel } from './plugins/ZoomPanel';
import { PencilPanel } from './plugins/PencilPanel';
import { TextPanel } from './plugins/TextPanel';
import { SelectPanel } from './plugins/SelectPanel';
import { DeletePanel } from './plugins/DeletePanel';
import { OrderPanel } from './plugins/OrderPanel';
import { ArrangePanel } from './plugins/ArrangePanel';
import { ShapePanel } from './plugins/ShapePanel';
import {
  Move,
  Pen,
  Type,
  MousePointer,
  Shapes,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activePlugin, setActivePlugin } = useCanvasStore();

  const plugins = [
    { name: 'select', label: 'Select', icon: MousePointer },
    { name: 'pan', label: 'Pan', icon: Move },
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
        padding: '8px',
        borderBottom: '1px solid #ddd',
        backgroundColor: '#f9f9f9'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '4px'
        }}>
          {plugins.map((plugin) => {
            const IconComponent = plugin.icon;
            return (
              <button
                key={plugin.name}
                onClick={() => setActivePlugin(activePlugin === plugin.name ? null : plugin.name)}
                style={{
                  padding: '8px',
                  backgroundColor: activePlugin === plugin.name ? '#007bff' : '#fff',
                  color: activePlugin === plugin.name ? '#fff' : '#333',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  minHeight: '50px'
                }}
                title={plugin.label}
              >
                <IconComponent size={20} />
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
        gap: '8px'
      }}>
        <SelectPanel />
        <PanPanel />
        <ZoomPanel />
        <PencilPanel />
        <TextPanel />
        <ShapePanel />
        <DeletePanel />
        <OrderPanel />
        <ArrangePanel />
      </div>
    </div>
  );
};