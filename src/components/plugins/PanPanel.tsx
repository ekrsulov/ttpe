import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Hand, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { Tag } from '../ui/Tag';

export const PanPanel: React.FC = () => {
  const { pan, resetPan } = useCanvasStore();
  const panAmount = 50; // pixels to pan

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Hand size={16} style={{ marginRight: '6px', color: '#666' }} />
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Pan</span>
        </div>
        <Tag badge={true}>
          {Math.round(useCanvasStore.getState().viewport.panX)}, {Math.round(useCanvasStore.getState().viewport.panY)}
        </Tag>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Direction buttons group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Pan Left */}
          <IconButton onClick={() => pan(-panAmount, 0)} title="Pan Left" borderColor="#dee2e6">
            <ChevronLeft size={14} />
          </IconButton>

          {/* Pan Up */}
          <IconButton onClick={() => pan(0, -panAmount)} title="Pan Up" borderColor="#dee2e6">
            <ChevronUp size={14} />
          </IconButton>

          {/* Pan Down */}
          <IconButton onClick={() => pan(0, panAmount)} title="Pan Down" borderColor="#dee2e6">
            <ChevronDown size={14} />
          </IconButton>

          {/* Pan Right */}
          <IconButton onClick={() => pan(panAmount, 0)} title="Pan Right" borderColor="#dee2e6">
            <ChevronRight size={14} />
          </IconButton>
        </div>

        {/* Reset Pan - aligned to the right */}
        <IconButton onClick={resetPan} title="Reset Pan" borderColor="#dee2e6">
          <RotateCcw size={14} />
        </IconButton>
      </div>
    </div>
  );
};