import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { RotateCcw } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { PanelWithHeader } from '../ui/PanelComponents';

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
    <PanelWithHeader icon={<RotateCcw size={16} />} title="SubPath Operations">
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {/* Reverse operation */}
        <IconButton
          onPointerUp={performReverse}
          title="Reverse subpath direction"
        >
          <RotateCcw size={14} />
        </IconButton>
      </div>
    </PanelWithHeader>
  );
};