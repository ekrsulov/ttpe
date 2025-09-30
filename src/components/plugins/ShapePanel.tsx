import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Square, Circle, Triangle, Shapes, type LucideIcon } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { PanelWithHeader } from '../ui/PanelComponents';
import type { ShapeType } from '../../store/slices/plugins/shapePluginSlice';

export const ShapePanel: React.FC = () => {
  const { shape, updateShapeState, setActivePlugin, activePlugin } = useCanvasStore();

  const shapes: { type: ShapeType; label: string; icon: LucideIcon }[] = [
    { type: 'square', label: 'Square', icon: Square },
    { type: 'circle', label: 'Circle', icon: Circle },
    { type: 'triangle', label: 'Triangle', icon: Triangle },
    { type: 'rectangle', label: 'Rectangle', icon: Square },
  ];

  const handleShapeSelect = (shapeType: ShapeType) => {
    updateShapeState({ selectedShape: shapeType });
    // Auto-switch to shape mode when selecting a shape
    setActivePlugin('shape');
  };

  return (
    <PanelWithHeader icon={<Shapes size={16} />} title="Shape">
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {shapes.map((shapeItem) => {
          const IconComponent = shapeItem.icon;
          const isShapeSelected = shape.selectedShape === shapeItem.type;
          const isShapeModeActive = activePlugin === 'shape';
          const shouldHighlight = isShapeModeActive && isShapeSelected;

          return (
            <IconButton
              key={shapeItem.type}
              onPointerUp={() => handleShapeSelect(shapeItem.type)}
              active={shouldHighlight}
              activeBgColor="#007bff"
              activeColor="#fff"
              transition="all 0.2s ease"
              title={`${shapeItem.label} - Click and drag to create`}
            >
              <IconComponent size={14} />
            </IconButton>
          );
        })}
      </div>
    </PanelWithHeader>
  );
};