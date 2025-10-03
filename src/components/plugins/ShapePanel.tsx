import React from 'react';
import { HStack, IconButton as ChakraIconButton, Tooltip } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Square, Circle, Triangle, Shapes, type LucideIcon } from 'lucide-react';
import { Panel } from '../ui/Panel';
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
    <Panel icon={<Shapes size={16} />} title="Shape">
      <HStack spacing={1}>
        {shapes.map((shapeItem) => {
          const IconComponent = shapeItem.icon;
          const isShapeSelected = shape.selectedShape === shapeItem.type;
          const isShapeModeActive = activePlugin === 'shape';
          const shouldHighlight = isShapeModeActive && isShapeSelected;

          return (
            <Tooltip key={shapeItem.type} label={`${shapeItem.label} - Click and drag to create`} fontSize="xs">
              <ChakraIconButton
                aria-label={shapeItem.label}
                icon={<IconComponent size={14} />}
                onClick={() => handleShapeSelect(shapeItem.type)}
                colorScheme={shouldHighlight ? 'brand' : 'gray'}
                variant={shouldHighlight ? 'solid' : 'outline'}
                size="sm"
              />
            </Tooltip>
          );
        })}
      </HStack>
    </Panel>
  );
};