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
  MoveVertical,
  Trash2
} from 'lucide-react';
import { IconButton } from '../ui/IconButton';

export const ArrangePanel: React.FC = () => {
  const {
    selectedIds,
    selectedCommands,
    activePlugin,
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
    distributeVertically,
    deleteSelectedCommands,
    alignLeftCommands,
    alignCenterCommands,
    alignRightCommands,
    alignTopCommands,
    alignMiddleCommands,
    alignBottomCommands,
    distributeHorizontallyCommands,
    distributeVerticallyCommands
  } = useCanvasStore();

  const selectedCount = selectedIds.length;
  const selectedCommandsCount = selectedCommands.length;
  const canAlign = selectedCount >= 2 || (activePlugin === 'edit' && selectedCommandsCount >= 2);
  const canDistribute = selectedCount >= 3 || (activePlugin === 'edit' && selectedCommandsCount >= 3);
  const canDelete = activePlugin === 'edit' && selectedCommandsCount > 0;

  return (
    <div style={{ 
      backgroundColor: '#fff', 
      padding: '8px 8px 0 8px',
      borderTop: '1px solid #ddd',
      width: '100%'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Distribution & Order buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '2px',
          width: activePlugin === 'edit' ? '100%' : 'auto',
          justifyContent: activePlugin === 'edit' ? 'space-between' : 'flex-start'
        }}>
          <div style={{ 
            flex: activePlugin === 'edit' ? 'none' : 1,
            width: activePlugin === 'edit' ? 'auto' : 'auto'
          }}>
            <IconButton 
              onClick={activePlugin === 'edit' ? distributeHorizontallyCommands : distributeHorizontally} 
              disabled={!canDistribute} 
              title="Distribute Horizontally"
            >
              <MoveHorizontal size={10} />
            </IconButton>
          </div>
          <div style={{ 
            flex: activePlugin === 'edit' ? 'none' : 1,
            width: activePlugin === 'edit' ? 'auto' : 'auto',
            margin: activePlugin === 'edit' ? '0 auto' : '0'
          }}>
            <IconButton 
              onClick={activePlugin === 'edit' ? distributeVerticallyCommands : distributeVertically} 
              disabled={!canDistribute} 
              title="Distribute Vertically"
            >
              <MoveVertical size={10} />
            </IconButton>
          </div>

          {activePlugin === 'edit' ? (
            /* Delete button for edit mode */
            <div style={{ 
              flex: 'none',
              width: 'auto'
            }}>
              <IconButton 
                onClick={deleteSelectedCommands} 
                disabled={!canDelete} 
                active={canDelete}
                activeBgColor="#dc3545"
                activeColor="#fff"
                title="Delete Selected Commands"
              >
                <Trash2 size={10} />
              </IconButton>
            </div>
          ) : (
            /* Order buttons for other modes */
            <>
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
            </>
          )}
        </div>

        {/* Align buttons */}
        <div style={{ display: 'flex', gap: '2px' }}>
          {/* Horizontal alignment */}
          <div style={{ flex: 1 }}>
            <IconButton 
              onClick={activePlugin === 'edit' ? alignLeftCommands : alignLeft} 
              disabled={!canAlign} 
              title="Align Left"
            >
              <AlignLeft size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton 
              onClick={activePlugin === 'edit' ? alignCenterCommands : alignCenter} 
              disabled={!canAlign} 
              title="Align Center"
            >
              <AlignCenter size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton 
              onClick={activePlugin === 'edit' ? alignRightCommands : alignRight} 
              disabled={!canAlign} 
              title="Align Right"
            >
              <AlignRight size={10} />
            </IconButton>
          </div>

          {/* Vertical alignment */}
          <div style={{ flex: 1 }}>
            <IconButton 
              onClick={activePlugin === 'edit' ? alignTopCommands : alignTop} 
              disabled={!canAlign} 
              title="Align Top"
            >
              <AlignVerticalJustifyStart size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton 
              onClick={activePlugin === 'edit' ? alignMiddleCommands : alignMiddle} 
              disabled={!canAlign} 
              title="Align Middle"
            >
              <AlignVerticalJustifyCenter size={10} />
            </IconButton>
          </div>
          <div style={{ flex: 1 }}>
            <IconButton 
              onClick={activePlugin === 'edit' ? alignBottomCommands : alignBottom} 
              disabled={!canAlign} 
              title="Align Bottom"
            >
              <AlignVerticalJustifyEnd size={10} />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
};