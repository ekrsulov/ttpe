import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Square, Circle, Triangle, Shapes } from 'lucide-react';
import type { ShapeType } from '../../store/slices/plugins/shapePluginSlice';

export const ShapePanel: React.FC = () => {
  const { plugins, updatePluginState, setActivePlugin } = useCanvasStore();

  const shapes: { type: ShapeType; label: string; icon: React.ComponentType<any> }[] = [
    { type: 'square', label: 'Square', icon: Square },
    { type: 'circle', label: 'Circle', icon: Circle },
    { type: 'triangle', label: 'Triangle', icon: Triangle },
    { type: 'rectangle', label: 'Rectangle', icon: Square },
  ];

  const handleShapeSelect = (shapeType: ShapeType) => {
    updatePluginState('shape', { selectedShape: shapeType });
    // Auto-switch to shape mode when selecting a shape
    setActivePlugin('shape');
  };

  return (
    <div style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <Shapes size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Shape</span>
      </div>

      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {shapes.map((shape) => {
          const IconComponent = shape.icon;
          const isSelected = plugins.shape.selectedShape === shape.type;

          return (
            <button
              key={shape.type}
              onClick={() => handleShapeSelect(shape.type)}
              style={{
                padding: '6px',
                backgroundColor: isSelected ? '#007bff' : '#f8f9fa',
                color: isSelected ? '#fff' : '#333',
                border: '1px solid #dee2e6',
                borderRadius: '3px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                transition: 'all 0.2s ease',
                minWidth: '32px',
                minHeight: '32px'
              }}
              title={`${shape.label} - Click and drag to create`}
            >
              <IconComponent size={14} />
            </button>
          );
        })}
      </div>
    </div>
  );
};