import React from 'react';
import { Button } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { RotateCcw } from 'lucide-react';
import { Panel } from '../ui/Panel';

const SubPathOperationsPanelComponent: React.FC = () => {
  // Subscribe only to primitives to minimize re-renders
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const selectedSubpathsCount = useCanvasStore(state => state.selectedSubpaths.length);

  // Show only when subpath plugin is active and exactly 1 subpath is selected
  if (activePlugin !== 'subpath' || selectedSubpathsCount !== 1) {
    return null;
  }

  const performReverse = () => {
    useCanvasStore.getState().performSubPathReverse();
  };

  return (
    <Panel icon={<RotateCcw size={16} />} title="SubPath Operations">
      <Button
        aria-label="Reverse subpath direction"
        onClick={performReverse}
        variant="unstyled"
        size="sm"
        bg="transparent"
        color="gray.700"
        border="1px solid"
        borderColor="gray.400"
        borderRadius="md"
        fontWeight="medium"
        fontSize="10px"
        transition="all 0.2s"
        _hover={{
          bg: 'gray.50'
        }}
        sx={{
          minH: '28px',
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Reverse
      </Button>
    </Panel>
  );
};

// Export memoized version - only re-renders when props change (no props = never re-renders from parent)
// Component only re-renders internally when activePlugin or selectedSubpaths changes
export const SubPathOperationsPanel = React.memo(SubPathOperationsPanelComponent);
