import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  Triangle,
  ChevronUp,
  ChevronDown,
  AlignLeft,
  AlignRight,
  AlignCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  MoveHorizontal,
  MoveVertical
} from 'lucide-react';
import { IconButton } from '../ui/IconButton';

export const ArrangePanel: React.FC = () => {
  const {
    selectedIds,
    bringToFront,
    sendForward,
    sendBackward,
    sendToBack,
    alignLeft,
    alignCenter,
    alignRight,
    alignTop,
    alignMiddle,
    alignBottom,
    distributeHorizontally,
    distributeVertically
  } = useCanvasStore();

  const selectedCount = selectedIds.length;
  const canAlign = selectedCount >= 2;
  const canDistribute = selectedCount >= 3;

  return (
    <div style={{ 
      backgroundColor: '#fff', 
      padding: '8px 8px 0 8px',
      borderTop: '1px solid #ddd'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Distribution & Order buttons */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <div style={{ flex: 1 }}>
            <IconButton onClick={distributeHorizontally} disabled={!canDistribute} title="Distribute Horizontally" borderColor="#dee2e6">
              <MoveHorizontal size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={distributeVertically} disabled={!canDistribute} title="Distribute Vertically" borderColor="#dee2e6">
              <MoveVertical size={10} />
            </IconButton>
          </div>

          {/* Order buttons */}
          <div style={{ flex: 1 }}>
            <IconButton onClick={bringToFront} disabled={selectedCount === 0} title="Bring to Front" borderColor="#dee2e6">
              <Triangle size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={sendForward} disabled={selectedCount === 0} title="Send Forward" borderColor="#dee2e6">
              <ChevronUp size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={sendBackward} disabled={selectedCount === 0} title="Send Backward" borderColor="#dee2e6">
              <ChevronDown size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={sendToBack} disabled={selectedCount === 0} title="Send to Back" borderColor="#dee2e6">
              <Triangle size={10} style={{ transform: 'rotate(180deg)' }} />
            </IconButton>
          </div>
        </div>

        {/* Align buttons */}
        <div style={{ display: 'flex', gap: '2px' }}>
          {/* Horizontal alignment */}
          <div style={{ flex: 1 }}>
            <IconButton onClick={alignLeft} disabled={!canAlign} title="Align Left" borderColor="#dee2e6">
              <AlignLeft size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={alignCenter} disabled={!canAlign} title="Align Center" borderColor="#dee2e6">
              <AlignCenter size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={alignRight} disabled={!canAlign} title="Align Right" borderColor="#dee2e6">
              <AlignRight size={10} />
            </IconButton>
          </div>

          {/* Vertical alignment */}
          <div style={{ flex: 1 }}>
            <IconButton onClick={alignTop} disabled={!canAlign} title="Align Top" borderColor="#dee2e6">
              <AlignVerticalJustifyStart size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={alignMiddle} disabled={!canAlign} title="Align Middle" borderColor="#dee2e6">
              <AlignVerticalJustifyCenter size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={alignBottom} disabled={!canAlign} title="Align Bottom" borderColor="#dee2e6">
              <AlignVerticalJustifyEnd size={10} />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
};