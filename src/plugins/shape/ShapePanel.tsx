import React from 'react';
import { HStack, VStack } from '@chakra-ui/react';
import { PanelToggle } from '../../ui/PanelToggle';
import { ToggleButton } from '../../ui/ToggleButton';
import { useCanvasStore } from '../../store/canvasStore';
import { Square, Circle, Triangle, type LucideIcon } from 'lucide-react';
import { Panel } from '../../ui/Panel';
import type { ShapeType } from './slice';

export const ShapePanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const shape = useCanvasStore(state => state.shape);
  const updateShapeState = useCanvasStore(state => state.updateShapeState);
  const setActivePlugin = useCanvasStore(state => state.setActivePlugin);
  const activePlugin = useCanvasStore(state => state.activePlugin);

  const shapes: { type: ShapeType; label: string; icon: LucideIcon }[] = [
    { type: 'square', label: 'Square', icon: Square },
    { type: 'circle', label: 'Circle', icon: Circle },
    { type: 'triangle', label: 'Triangle', icon: Triangle },
    { type: 'rectangle', label: 'Rectangle', icon: Square },
  ];

  const handleShapeSelect = (shapeType: ShapeType) => {
    updateShapeState?.({ selectedShape: shapeType });
    // Auto-switch to shape mode when selecting a shape
    setActivePlugin('shape');
  };

  return (
    <Panel title="Shape">
      <VStack spacing={3} align="stretch">
        <HStack spacing={1}>
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
                icon={<IconComponent size={14} />}
                aria-label={`${shapeItem.label} - Click and drag to create`}
                title={`${shapeItem.label} - Click and drag to create`}
                size="lg"
              />
            );
          })}
        </HStack>
        
        <PanelToggle
          isChecked={shape?.keepShapeMode || false}
          onChange={(e) => updateShapeState?.({ keepShapeMode: e.target.checked })}
        >
          Keep creating shapes
        </PanelToggle>
      </VStack>
    </Panel>
  );
};