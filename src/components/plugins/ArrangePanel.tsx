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
    alignLeftCommands,
    alignCenterCommands,
    alignRightCommands,
    alignTopCommands,
    alignMiddleCommands,
    alignBottomCommands,
    distributeHorizontallyCommands,
    distributeVerticallyCommands,
    getSelectedSubpathsCount,
    bringSubpathToFront,
    sendSubpathForward,
    sendSubpathBackward,
    sendSubpathToBack,
    alignLeftSubpaths,
    alignCenterSubpaths,
    alignRightSubpaths,
    alignTopSubpaths,
    alignMiddleSubpaths,
    alignBottomSubpaths,
    distributeHorizontallySubpaths,
    distributeVerticallySubpaths
  } = useCanvasStore();

  const selectedCount = selectedIds.length;
  const selectedCommandsCount = selectedCommands.length;
  const selectedSubpathsCount = getSelectedSubpathsCount();
  const canAlign = selectedCount >= 2 || 
                   (activePlugin === 'edit' && selectedCommandsCount >= 2) ||
                   (activePlugin === 'subpath' && selectedSubpathsCount >= 2);
  const canDistribute = selectedCount >= 3 || 
                        (activePlugin === 'edit' && selectedCommandsCount >= 3) ||
                        (activePlugin === 'subpath' && selectedSubpathsCount >= 3);

  return (
    <div style={{ 
      backgroundColor: '#fff', 
      padding: '8px 8px 0 8px',
      borderTop: '1px solid #ddd',
      width: '100%'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {activePlugin === 'subpath' ? (
          /* Subpath mode layout - same as select mode but without delete */
          <>
            {/* Row 1: Distribution & Order buttons */}
            <div style={{ display: 'flex', gap: '2px' }}>
              {/* Distribution buttons */}
              <div style={{ flex: 1 }}>
                <IconButton 
                  onClick={distributeHorizontallySubpaths} 
                  disabled={!canDistribute} 
                  title="Distribute Horizontally"
                >
                  <MoveHorizontal size={10} />
                </IconButton>
              </div>
              <div style={{ flex: 1 }}>
                <IconButton 
                  onClick={distributeVerticallySubpaths} 
                  disabled={!canDistribute} 
                  title="Distribute Vertically"
                >
                  <MoveVertical size={10} />
                </IconButton>
              </div>
              
              {/* Order buttons */}
              <div style={{ flex: 1 }}>
                <IconButton onClick={bringSubpathToFront} disabled={selectedSubpathsCount === 0} title="Bring Subpath to Front">
                  <Triangle size={10} />
                </IconButton>
              </div>
              <div style={{ flex: 1 }}>
                <IconButton onClick={sendSubpathForward} disabled={selectedSubpathsCount === 0} title="Send Subpath Forward">
                  <ChevronUp size={10} />
                </IconButton>
              </div>
              <div style={{ flex: 1 }}>
                <IconButton onClick={sendSubpathBackward} disabled={selectedSubpathsCount === 0} title="Send Subpath Backward">
                  <ChevronDown size={10} />
                </IconButton>
              </div>
              <div style={{ flex: 1 }}>
                <IconButton onClick={sendSubpathToBack} disabled={selectedSubpathsCount === 0} title="Send Subpath to Back">
                  <Triangle size={10} style={{ transform: 'rotate(180deg)' }} />
                </IconButton>
              </div>
            </div>

            {/* Row 2: Align buttons */}
            <div style={{ display: 'flex', gap: '2px' }}>
              {/* Horizontal alignment */}
              <div style={{ flex: 1 }}>
                <IconButton 
                  onClick={alignLeftSubpaths} 
                  disabled={!canAlign} 
                  title="Align Left"
                >
                  <AlignLeft size={10} />
                </IconButton>
              </div>
              <div style={{ flex: 1 }}>
                <IconButton 
                  onClick={alignCenterSubpaths} 
                  disabled={!canAlign} 
                  title="Align Center"
                >
                  <AlignCenter size={10} />
                </IconButton>
              </div>
              <div style={{ flex: 1 }}>
                <IconButton 
                  onClick={alignRightSubpaths} 
                  disabled={!canAlign} 
                  title="Align Right"
                >
                  <AlignRight size={10} />
                </IconButton>
              </div>

              {/* Vertical alignment */}
              <div style={{ flex: 1 }}>
                <IconButton 
                  onClick={alignTopSubpaths} 
                  disabled={!canAlign} 
                  title="Align Top"
                >
                  <AlignVerticalJustifyStart size={10} />
                </IconButton>
              </div>
              <div style={{ flex: 1 }}>
                <IconButton 
                  onClick={alignMiddleSubpaths} 
                  disabled={!canAlign} 
                  title="Align Middle"
                >
                  <AlignVerticalJustifyCenter size={10} />
                </IconButton>
              </div>
              <div style={{ flex: 1 }}>
                <IconButton 
                  onClick={alignBottomSubpaths} 
                  disabled={!canAlign} 
                  title="Align Bottom"
                >
                  <AlignVerticalJustifyEnd size={10} />
                </IconButton>
              </div>
            </div>
          </>
        ) : (
          /* Original layout for edit and other modes */
          <>
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
                  onClick={
                    activePlugin === 'edit' ? distributeHorizontallyCommands :
                    distributeHorizontally
                  } 
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
                  onClick={
                    activePlugin === 'edit' ? distributeVerticallyCommands :
                    distributeVertically
                  } 
                  disabled={!canDistribute} 
                  title="Distribute Vertically"
                >
                  <MoveVertical size={10} />
                </IconButton>
              </div>

              {activePlugin === 'edit' ? (
                /* Spacer for edit mode layout */
                <div style={{ 
                  flex: 'none',
                  width: 'auto'
                }}>
                </div>
              ) : (
                /* Order buttons for select mode */
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
                  onClick={
                    activePlugin === 'edit' ? alignLeftCommands :
                    alignLeft
                  } 
                  disabled={!canAlign} 
                  title="Align Left"
                >
                  <AlignLeft size={10} />
                </IconButton>
              </div>
              <div style={{ flex: 1 }}>
                <IconButton 
                  onClick={
                    activePlugin === 'edit' ? alignCenterCommands :
                    alignCenter
                  } 
                  disabled={!canAlign} 
                  title="Align Center"
                >
                  <AlignCenter size={10} />
                </IconButton>
              </div>
              <div style={{ flex: 1 }}>
                <IconButton 
                  onClick={
                    activePlugin === 'edit' ? alignRightCommands :
                    alignRight
                  } 
                  disabled={!canAlign} 
                  title="Align Right"
                >
                  <AlignRight size={10} />
                </IconButton>
              </div>

              {/* Vertical alignment */}
              <div style={{ flex: 1 }}>
                <IconButton 
                  onClick={
                    activePlugin === 'edit' ? alignTopCommands :
                    alignTop
                  } 
                  disabled={!canAlign} 
                  title="Align Top"
                >
                  <AlignVerticalJustifyStart size={10} />
                </IconButton>
              </div>
              <div style={{ flex: 1 }}>
                <IconButton 
                  onClick={
                    activePlugin === 'edit' ? alignMiddleCommands :
                    alignMiddle
                  } 
                  disabled={!canAlign} 
                  title="Align Middle"
                >
                  <AlignVerticalJustifyCenter size={10} />
                </IconButton>
              </div>
              <div style={{ flex: 1 }}>
                <IconButton 
                  onClick={
                    activePlugin === 'edit' ? alignBottomCommands :
                    alignBottom
                  } 
                  disabled={!canAlign} 
                  title="Align Bottom"
                >
                  <AlignVerticalJustifyEnd size={10} />
                </IconButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};