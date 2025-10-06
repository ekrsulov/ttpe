import React from 'react';
import { IconButton as ChakraIconButton, HStack, VStack, Tag as ChakraTag } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Hand, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight } from 'lucide-react';
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
      <VStack spacing={1} align="center">
        {/* First row: NW, N, NE */}
        <HStack spacing={1}>
          <ChakraIconButton
            aria-label="Pan Northwest"
            icon={<ArrowUpLeft size={14} />}
            onClick={() => pan(-panAmount, -panAmount)}
            size="sm"
            variant="secondary"
          />
          <ChakraIconButton
            aria-label="Pan North"
            icon={<ChevronUp size={14} />}
            onClick={() => pan(0, -panAmount)}
            size="sm"
            variant="secondary"
          />
          <ChakraIconButton
            aria-label="Pan Northeast"
            icon={<ArrowUpRight size={14} />}
            onClick={() => pan(panAmount, -panAmount)}
            size="sm"
            variant="secondary"
          />
        </HStack>

        {/* Second row: W, Reset, E */}
        <HStack spacing={1}>
          <ChakraIconButton
            aria-label="Pan West"
            icon={<ChevronLeft size={14} />}
            onClick={() => pan(-panAmount, 0)}
            size="sm"
            variant="secondary"
          />
          <ChakraIconButton
            aria-label="Reset Pan"
            icon={<RotateCcw size={14} />}
            onClick={resetPan}
            size="sm"
            variant="secondary"
          />
          <ChakraIconButton
            aria-label="Pan East"
            icon={<ChevronRight size={14} />}
            onClick={() => pan(panAmount, 0)}
            size="sm"
            variant="secondary"
          />
        </HStack>

        {/* Third row: SW, S, SE */}
        <HStack spacing={1}>
          <ChakraIconButton
            aria-label="Pan Southwest"
            icon={<ArrowDownLeft size={14} />}
            onClick={() => pan(-panAmount, panAmount)}
            size="sm"
            variant="secondary"
          />
          <ChakraIconButton
            aria-label="Pan South"
            icon={<ChevronDown size={14} />}
            onClick={() => pan(0, panAmount)}
            size="sm"
            variant="secondary"
          />
          <ChakraIconButton
            aria-label="Pan Southeast"
            icon={<ArrowDownRight size={14} />}
            onClick={() => pan(panAmount, panAmount)}
            size="sm"
            variant="secondary"
          />
        </HStack>
      </VStack>
    </Panel>
  );
};