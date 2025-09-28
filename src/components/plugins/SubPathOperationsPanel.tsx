import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { RotateCcw } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { Tag } from '../ui/Tag';

export const SubPathOperationsPanel: React.FC = () => {
  const { selectedSubpaths, performSubPathReverse } = useCanvasStore();

  // Show if at least 1 subpath is selected
  if (selectedSubpaths.length < 1) {
    return null;
  }

  const performReverse = () => {
    performSubPathReverse();
  };

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <RotateCcw size={16} style={{ marginRight: '6px', color: '#666' }} />
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>SubPath Operations</span>
        </div>
        <Tag badge={true}>
          {selectedSubpaths.length}
        </Tag>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {/* Reverse operation */}
        <IconButton
          onPointerUp={performReverse}
          title="Reverse subpath direction"
        >
          <RotateCcw size={14} />
        </IconButton>
      </div>
    </div>
  );
};