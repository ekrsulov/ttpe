import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Square, Circle, Triangle, Shapes } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import type { ShapeType } from '../../store/slices/plugins/shapePluginSlice';

export const ShapePanel: React.FC = () => {
  const { plugins, updatePluginState, setActivePlugin, activePlugin } = useCanvasStore();

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
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <Shapes size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Shape</span>
      </div>

      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {shapes.map((shape) => {
          const IconComponent = shape.icon;
          const isShapeSelected = plugins.shape.selectedShape === shape.type;
          const isShapeModeActive = activePlugin === 'shape';
          const shouldHighlight = isShapeModeActive && isShapeSelected;

          return (
            <IconButton
              key={shape.type}
              onClick={() => handleShapeSelect(shape.type)}
              active={shouldHighlight}
              activeBgColor="#007bff"
              activeColor="#fff"
              borderColor="#ccc"
              transition="all 0.2s ease"
              title={`${shape.label} - Click and drag to create`}
            >
              <IconComponent size={14} />
            </IconButton>
          );
        })}
      </div>
    </div>
  );
};