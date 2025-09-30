import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Hand, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { Tag } from '../ui/Tag';
import { PanelWithHeader } from '../ui/PanelComponents';

export const PanPanel: React.FC = () => {
  const { pan, resetPan } = useCanvasStore();
  const panAmount = 50; // pixels to pan

  return (
    <PanelWithHeader 
      icon={<Hand size={16} />} 
      title="Pan"
      headerActions={
        <Tag badge={true}>
          {Math.round(useCanvasStore.getState().viewport.panX)}, {Math.round(useCanvasStore.getState().viewport.panY)}
        </Tag>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Direction buttons group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Pan Left */}
          <IconButton onClick={() => pan(-panAmount, 0)} title="Pan Left">
            <ChevronLeft size={14} />
          </IconButton>

          {/* Pan Up */}
          <IconButton onClick={() => pan(0, -panAmount)} title="Pan Up">
            <ChevronUp size={14} />
          </IconButton>

          {/* Pan Down */}
          <IconButton onClick={() => pan(0, panAmount)} title="Pan Down">
            <ChevronDown size={14} />
          </IconButton>

          {/* Pan Right */}
          <IconButton onClick={() => pan(panAmount, 0)} title="Pan Right">
            <ChevronRight size={14} />
          </IconButton>
        </div>

        {/* Reset Pan - aligned to the right */}
        <IconButton onClick={resetPan} title="Reset Pan">
          <RotateCcw size={14} />
        </IconButton>
      </div>
    </PanelWithHeader>
  );
};