import React from 'react';
import { VStack, HStack, Box } from '@chakra-ui/react';
import { Circle, Square, Triangle, RectangleHorizontal, Diamond, Heart, Minus } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { ToggleButton } from '../../ui/ToggleButton';
import { PanelToggle } from '../../ui/PanelToggle';
import type { ShapeType } from './slice';

export const ShapeExpandablePanel: React.FC = () => {
  const shape = useCanvasStore(state => state.shape);
  const updateShapeState = useCanvasStore(state => state.updateShapeState);
  const setActivePlugin = useCanvasStore(state => state.setActivePlugin);
  const activePlugin = useCanvasStore(state => state.activePlugin);
  
  const shapes: Array<{ type: ShapeType; label: string; icon: typeof Circle }> = [
    { type: 'line', label: 'Line', icon: Minus },
    { type: 'circle', label: 'Circle', icon: Circle },
    { type: 'square', label: 'Square', icon: Square },
    { type: 'triangle', label: 'Triangle', icon: Triangle },
    { type: 'rectangle', label: 'Rectangle', icon: RectangleHorizontal },
    { type: 'diamond', label: 'Diamond', icon: Diamond },
    { type: 'heart', label: 'Heart', icon: Heart },
  ];
  
  const handleShapeSelect = (shapeType: ShapeType) => {
    updateShapeState?.({ selectedShape: shapeType });
    setActivePlugin('shape');
  };
  
  return (
    <VStack spacing={3} align="stretch" w="full">
      <HStack spacing={2} justify="center" w="full" flexWrap="wrap">
        {shapes.map((shapeItem) => {
          const IconComponent = shapeItem.icon;
          const isShapeSelected = shape?.selectedShape === shapeItem.type;
          const isShapeModeActive = activePlugin === 'shape';
          const shouldHighlight = isShapeModeActive && isShapeSelected;

          return (
            <ToggleButton
              key={shapeItem.type}
              isActive={shouldHighlight}
              onClick={() => handleShapeSelect(shapeItem.type)}
              icon={<IconComponent size={18} />}
              aria-label={`${shapeItem.label}`}
              title={`${shapeItem.label}`}
              size="md"
            />
          );
        })}
      </HStack>
      <Box display="flex" justifyContent="center" w="full">
        <PanelToggle
          isChecked={shape?.keepShapeMode || false}
          onChange={(e) => updateShapeState?.({ keepShapeMode: e.target.checked })}
        >
          Keep creating shapes
        </PanelToggle>
      </Box>
    </VStack>
  );
};
