import React from 'react';
import { VStack, HStack, IconButton as ChakraIconButton, Text } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Pen, Route, Square, PenTool } from 'lucide-react';
import { Panel } from '../ui/Panel';

export const PencilPanel: React.FC = () => {
  const { pencil, updatePencilState, setMode, activePlugin } = useCanvasStore();

  const handleReusePathToggle = () => {
    updatePencilState({ reusePath: !pencil.reusePath });
  };

  const handleCurvesToggle = () => {
    if (activePlugin === 'curves') {
      setMode('pencil');
    } else {
      setMode('curves');
    }
  };

  return (
    <Panel icon={<Pen size={16} />} title="Pencil">
      <VStack spacing={2} align="stretch">
        {/* Path Mode Selection */}
        <HStack spacing={1} justify="space-between">
          <Text fontSize="12px" color="gray.600">Path Mode:</Text>
          <HStack spacing={1}>
            <ChakraIconButton
              aria-label="New Path"
              icon={<Square size={12} />}
              onClick={handleReusePathToggle}
              colorScheme={!pencil.reusePath ? 'brand' : 'gray'}
              variant={!pencil.reusePath ? 'solid' : 'ghost'}
              bg={!pencil.reusePath ? undefined : 'transparent'}
              size="sm"
            />
            <ChakraIconButton
              aria-label="Add Subpath"
              icon={<Route size={12} />}
              onClick={handleReusePathToggle}
              colorScheme={pencil.reusePath ? 'brand' : 'gray'}
              variant={pencil.reusePath ? 'solid' : 'ghost'}
              bg={pencil.reusePath ? undefined : 'transparent'}
              size="sm"
            />
          </HStack>
        </HStack>

        {/* Curves Mode */}
        <HStack spacing={1} justify="space-between">
          <Text fontSize="12px" color="gray.600">Curves:</Text>
          <ChakraIconButton
            aria-label="Draw Curves"
            icon={<PenTool size={12} />}
            onClick={handleCurvesToggle}
            colorScheme={activePlugin === 'curves' ? 'brand' : 'gray'}
            variant={activePlugin === 'curves' ? 'solid' : 'ghost'}
            bg={activePlugin === 'curves' ? undefined : 'transparent'}
            size="sm"
          />
        </HStack>
      </VStack>
    </Panel>
  );
};