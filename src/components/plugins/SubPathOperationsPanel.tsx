import React from 'react';
import { HStack, IconButton as ChakraIconButton, Tooltip } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { RotateCcw } from 'lucide-react';
import { Panel } from '../ui/Panel';

const SubPathOperationsPanelComponent: React.FC = () => {
  // Subscribe only to activePlugin and selectedSubpaths to trigger re-renders when needed
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);

  // Show only when subpath plugin is active and exactly 1 subpath is selected
  if (activePlugin !== 'subpath' || selectedSubpaths.length !== 1) {
    return null;
  }

  const performReverse = () => {
    useCanvasStore.getState().performSubPathReverse();
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

// Export memoized version - only re-renders when props change (no props = never re-renders from parent)
// Component only re-renders internally when activePlugin or selectedSubpaths changes
export const SubPathOperationsPanel = React.memo(SubPathOperationsPanelComponent);
