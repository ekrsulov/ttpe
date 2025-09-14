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

export const Sidebar: React.FC = () => {
  const { activePlugin, setActivePlugin } = useCanvasStore();

  const plugins = [
    { name: 'pan', label: 'Pan' },
    { name: 'zoom', label: 'Zoom' },
    { name: 'pencil', label: 'Pencil' },
    { name: 'text', label: 'Text' },
    { name: 'select', label: 'Select' },
    { name: 'delete', label: 'Delete' },
    { name: 'order', label: 'Order' },
    { name: 'arrange', label: 'Arrange' },
  ];

  return (
    <div style={{
      width: '300px',
      height: '100vh',
      borderLeft: '1px solid #ccc',
      padding: '10px',
      overflowY: 'auto',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>Plugins</h3>
      <div style={{ marginBottom: '20px' }}>
        {plugins.map((plugin) => (
          <button
            key={plugin.name}
            onClick={() => setActivePlugin(activePlugin === plugin.name ? null : plugin.name)}
            style={{
              margin: '5px',
              padding: '5px 10px',
              backgroundColor: activePlugin === plugin.name ? '#007bff' : '#fff',
              color: activePlugin === plugin.name ? '#fff' : '#000',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {plugin.label}
          </button>
        ))}
      </div>

      <div>
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