import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { RotateCcw } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { OperationButton } from '../ui/OperationButton';

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
      <OperationButton
        aria-label="Reverse subpath direction"
        onClick={performReverse}
      >
        Reverse
      </OperationButton>
    </Panel>
  );
};

// Export memoized version - only re-renders when props change (no props = never re-renders from parent)
// Component only re-renders internally when activePlugin or selectedSubpaths changes
export const SubPathOperationsPanel = React.memo(SubPathOperationsPanelComponent);
