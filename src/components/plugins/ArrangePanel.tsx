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
            <IconButton onClick={distributeHorizontally} disabled={!canDistribute} title="Distribute Horizontally">
              <MoveHorizontal size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={distributeVertically} disabled={!canDistribute} title="Distribute Vertically">
              <MoveVertical size={10} />
            </IconButton>
          </div>

          {/* Order buttons */}
          <div style={{ flex: 1 }}>
            <IconButton onClick={bringToFront} disabled={selectedCount === 0} title="Bring to Front">
              <Triangle size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={sendForward} disabled={selectedCount === 0} title="Send Forward">
              <ChevronUp size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={sendBackward} disabled={selectedCount === 0} title="Send Backward">
              <ChevronDown size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={sendToBack} disabled={selectedCount === 0} title="Send to Back">
              <Triangle size={10} style={{ transform: 'rotate(180deg)' }} />
            </IconButton>
          </div>
        </div>

        {/* Align buttons */}
        <div style={{ display: 'flex', gap: '2px' }}>
          {/* Horizontal alignment */}
          <div style={{ flex: 1 }}>
            <IconButton onClick={alignLeft} disabled={!canAlign} title="Align Left">
              <AlignLeft size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={alignCenter} disabled={!canAlign} title="Align Center">
              <AlignCenter size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={alignRight} disabled={!canAlign} title="Align Right">
              <AlignRight size={10} />
            </IconButton>
          </div>

          {/* Vertical alignment */}
          <div style={{ flex: 1 }}>
            <IconButton onClick={alignTop} disabled={!canAlign} title="Align Top">
              <AlignVerticalJustifyStart size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={alignMiddle} disabled={!canAlign} title="Align Middle">
              <AlignVerticalJustifyCenter size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton onClick={alignBottom} disabled={!canAlign} title="Align Bottom">
              <AlignVerticalJustifyEnd size={10} />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
};