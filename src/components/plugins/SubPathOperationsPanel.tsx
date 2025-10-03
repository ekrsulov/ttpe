import React from 'react';
import { HStack, IconButton as ChakraIconButton, Tooltip } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { RotateCcw } from 'lucide-react';
import { Panel } from '../ui/Panel';

export const SubPathOperationsPanel: React.FC = () => {
  const { selectedSubpaths, performSubPathReverse, activePlugin } = useCanvasStore();

  // Show only when subpath plugin is active and exactly 1 subpath is selected
  if (activePlugin !== 'subpath' || selectedSubpaths.length !== 1) {
    return null;
  }

  const performReverse = () => {
    performSubPathReverse();
  };

  return (
    <Panel icon={<RotateCcw size={16} />} title="SubPath Operations">
      <HStack spacing={1}>
        {/* Reverse operation */}
        <Tooltip label="Reverse subpath direction" fontSize="xs">
          <ChakraIconButton
            aria-label="Reverse subpath direction"
            icon={<RotateCcw size={14} />}
            onClick={performReverse}
            size="sm"
            variant="secondary"
          />
        </Tooltip>
      </HStack>
    </Panel>
  );
};