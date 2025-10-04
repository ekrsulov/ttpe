import React from 'react';
import { IconButton as ChakraIconButton, HStack, Tag as ChakraTag } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Hand, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Panel } from '../ui/Panel';

export const PanPanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const pan = useCanvasStore(state => state.pan);
  const resetPan = useCanvasStore(state => state.resetPan);
  const panX = useCanvasStore(state => Math.round(state.viewport.panX));
  const panY = useCanvasStore(state => Math.round(state.viewport.panY));
  
  const panAmount = 50; // pixels to pan

  return (
    <Panel 
      icon={<Hand size={16} />} 
      title="Pan"
      headerActions={
        <ChakraTag size="sm" colorScheme="gray" fontSize="xs">
          {panX}, {panY}
        </ChakraTag>
      }
    >
      <HStack spacing={1} justify="space-between">
        {/* Direction buttons group */}
        <HStack spacing={1}>
          {/* Pan Left */}
          <ChakraIconButton
            aria-label="Pan Left"
            icon={<ChevronLeft size={14} />}
            onClick={() => pan(-panAmount, 0)}
            size="sm"
            variant="secondary"
          />

          {/* Pan Up */}
          <ChakraIconButton
            aria-label="Pan Up"
            icon={<ChevronUp size={14} />}
            onClick={() => pan(0, -panAmount)}
            size="sm"
            variant="secondary"
          />

          {/* Pan Down */}
          <ChakraIconButton
            aria-label="Pan Down"
            icon={<ChevronDown size={14} />}
            onClick={() => pan(0, panAmount)}
            size="sm"
            variant="secondary"
          />

          {/* Pan Right */}
          <ChakraIconButton
            aria-label="Pan Right"
            icon={<ChevronRight size={14} />}
            onClick={() => pan(panAmount, 0)}
            size="sm"
            variant="secondary"
          />
        </HStack>

        {/* Reset Pan - aligned to the right */}
        <ChakraIconButton
          aria-label="Reset Pan"
          icon={<RotateCcw size={14} />}
          onClick={resetPan}
          size="sm"
          variant="secondary"
        />
      </HStack>
    </Panel>
  );
};