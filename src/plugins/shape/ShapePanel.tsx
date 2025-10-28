import React from 'react';
import { HStack, IconButton as ChakraIconButton } from '@chakra-ui/react';
import ConditionalTooltip from '../../components/ui/ConditionalTooltip';
import { useCanvasStore } from '../../store/canvasStore';
import { Square, Circle, Triangle, type LucideIcon } from 'lucide-react';
import { Panel } from '../../components/ui/Panel';
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
      <HStack spacing={1}>
        {shapes.map((shapeItem) => {
          const IconComponent = shapeItem.icon;
          const isShapeSelected = shape?.selectedShape === shapeItem.type;
          const isShapeModeActive = activePlugin === 'shape';
          const shouldHighlight = isShapeModeActive && isShapeSelected;

          return (
            <ConditionalTooltip key={shapeItem.type} label={`${shapeItem.label} - Click and drag to create`} fontSize="xs">
              <ChakraIconButton
                aria-label={shapeItem.label}
                icon={<IconComponent size={14} />}
                onClick={() => handleShapeSelect(shapeItem.type)}
                variant="unstyled"
                size="sm"
                bg={shouldHighlight ? 'blue.500' : 'transparent'}
                color={shouldHighlight ? 'white' : 'gray.700'}
                border="1px solid"
                borderColor={shouldHighlight ? 'blue.500' : 'gray.400'}
                borderRadius="md"
                fontWeight="medium"
                transition="all 0.2s"
                _hover={{
                  bg: shouldHighlight ? 'blue.600' : 'gray.50'
                }}
                sx={{
                  minH: '28px',
                  px: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </ConditionalTooltip>
          );
        })}
      </HStack>
    </Panel>
  );
};