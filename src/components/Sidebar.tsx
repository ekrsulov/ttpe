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
import {
  Move,
  ZoomIn,
  Pen,
  Type,
  MousePointer,
  Trash2,
  Layers,
  AlignCenter
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activePlugin, setActivePlugin } = useCanvasStore();

  const plugins = [
    { name: 'pan', label: 'Pan', icon: Move },
    { name: 'zoom', label: 'Zoom', icon: ZoomIn },
    { name: 'pencil', label: 'Pencil', icon: Pen },
    { name: 'text', label: 'Text', icon: Type },
    { name: 'select', label: 'Select', icon: MousePointer },
    { name: 'delete', label: 'Delete', icon: Trash2 },
    { name: 'order', label: 'Order', icon: Layers },
    { name: 'arrange', label: 'Arrange', icon: AlignCenter },
  ];

  return (
    <div style={{
      width: '280px',
      height: '100vh',
      borderLeft: '1px solid #ccc',
      padding: '8px',
      overflowY: 'auto',
      backgroundColor: '#f9f9f9'
    }}>
      <div style={{ marginBottom: '12px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>Tools</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '4px',
          marginBottom: '12px'
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
                  gap: '2px',
                  fontSize: '10px',
                  minHeight: '50px'
                }}
                title={plugin.label}
              >
                <IconComponent size={16} />
                <span style={{ fontSize: '9px', textAlign: 'center' }}>{plugin.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <PanPanel />
        <ZoomPanel />
        <PencilPanel />
        <TextPanel />
        <SelectPanel />
        <DeletePanel />
        <OrderPanel />
        <ArrangePanel />
      </div>
    </div>
  );
};