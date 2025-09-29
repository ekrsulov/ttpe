import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { RotateCcw } from 'lucide-react';
import { IconButton } from '../ui/IconButton';

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
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
        <RotateCcw size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '800', color: '#333' }}>SubPath Operations</span>
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