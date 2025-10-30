import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { pluginManager } from '../../utils/pluginManager';

const SubPathOperationsPanelComponent: React.FC = () => {
  // Subscribe only to primitives to minimize re-renders
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const selectedSubpathsCount = useCanvasStore(state => state.selectedSubpaths?.length || 0);

  // Show only when subpath plugin is active and exactly 1 subpath is selected
  if (activePlugin !== 'subpath' || selectedSubpathsCount !== 1) {
    return null;
  }

  const performReverse = () => {
    // Use plugin API instead of store action
    pluginManager.callPluginApi('subpath', 'performSubPathReverse');
  };

  return (
    <Panel title="SubPath Operations">
      <PanelStyledButton
        aria-label="Reverse subpath direction"
        onClick={performReverse}
        w="full"
      >
        Reverse
      </PanelStyledButton>
    </Panel>
  );
};

// Export memoized version - only re-renders when props change (no props = never re-renders from parent)
// Component only re-renders internally when activePlugin or selectedSubpaths changes
export const SubPathOperationsPanel = React.memo(SubPathOperationsPanelComponent);
