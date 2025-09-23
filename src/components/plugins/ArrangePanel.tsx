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

interface ButtonConfig {
  handler: () => void;
  icon: React.ReactNode;
  title: string;
  disabled?: boolean;
}

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

  // Button configurations based on active plugin
  const getDistributionButtons = (): ButtonConfig[] => {
    if (activePlugin === 'subpath') {
      return [
        { handler: distributeHorizontallySubpaths, icon: <MoveHorizontal size={10} />, title: "Distribute Horizontally", disabled: !canDistribute },
        { handler: distributeVerticallySubpaths, icon: <MoveVertical size={10} />, title: "Distribute Vertically", disabled: !canDistribute }
      ];
    } else if (activePlugin === 'edit') {
      return [
        { handler: distributeHorizontallyCommands, icon: <MoveHorizontal size={10} />, title: "Distribute Horizontally", disabled: !canDistribute },
        { handler: distributeVerticallyCommands, icon: <MoveVertical size={10} />, title: "Distribute Vertically", disabled: !canDistribute }
      ];
    } else {
      return [
        { handler: distributeHorizontally, icon: <MoveHorizontal size={10} />, title: "Distribute Horizontally", disabled: !canDistribute },
        { handler: distributeVertically, icon: <MoveVertical size={10} />, title: "Distribute Vertically", disabled: !canDistribute }
      ];
    }
  };

  const getOrderButtons = (): ButtonConfig[] => {
    if (activePlugin === 'subpath') {
      return [
        { handler: bringSubpathToFront, icon: <Triangle size={10} />, title: "Bring Subpath to Front", disabled: selectedSubpathsCount === 0 },
        { handler: sendSubpathForward, icon: <ChevronUp size={10} />, title: "Send Subpath Forward", disabled: selectedSubpathsCount === 0 },
        { handler: sendSubpathBackward, icon: <ChevronDown size={10} />, title: "Send Subpath Backward", disabled: selectedSubpathsCount === 0 },
        { handler: sendSubpathToBack, icon: <Triangle size={10} style={{ transform: 'rotate(180deg)' }} />, title: "Send Subpath to Back", disabled: selectedSubpathsCount === 0 }
      ];
    } else {
      return [
        { handler: bringToFront, icon: <Triangle size={10} />, title: "Bring to Front", disabled: selectedCount === 0 },
        { handler: sendForward, icon: <ChevronUp size={10} />, title: "Send Forward", disabled: selectedCount === 0 },
        { handler: sendBackward, icon: <ChevronDown size={10} />, title: "Send Backward", disabled: selectedCount === 0 },
        { handler: sendToBack, icon: <Triangle size={10} style={{ transform: 'rotate(180deg)' }} />, title: "Send to Back", disabled: selectedCount === 0 }
      ];
    }
  };

  const getAlignmentButtons = (): ButtonConfig[] => {
    if (activePlugin === 'subpath') {
      return [
        { handler: alignLeftSubpaths, icon: <AlignLeft size={10} />, title: "Align Left", disabled: !canAlign },
        { handler: alignCenterSubpaths, icon: <AlignCenter size={10} />, title: "Align Center", disabled: !canAlign },
        { handler: alignRightSubpaths, icon: <AlignRight size={10} />, title: "Align Right", disabled: !canAlign },
        { handler: alignTopSubpaths, icon: <AlignVerticalJustifyStart size={10} />, title: "Align Top", disabled: !canAlign },
        { handler: alignMiddleSubpaths, icon: <AlignVerticalJustifyCenter size={10} />, title: "Align Middle", disabled: !canAlign },
        { handler: alignBottomSubpaths, icon: <AlignVerticalJustifyEnd size={10} />, title: "Align Bottom", disabled: !canAlign }
      ];
    } else if (activePlugin === 'edit') {
      return [
        { handler: alignLeftCommands, icon: <AlignLeft size={10} />, title: "Align Left", disabled: !canAlign },
        { handler: alignCenterCommands, icon: <AlignCenter size={10} />, title: "Align Center", disabled: !canAlign },
        { handler: alignRightCommands, icon: <AlignRight size={10} />, title: "Align Right", disabled: !canAlign },
        { handler: alignTopCommands, icon: <AlignVerticalJustifyStart size={10} />, title: "Align Top", disabled: !canAlign },
        { handler: alignMiddleCommands, icon: <AlignVerticalJustifyCenter size={10} />, title: "Align Middle", disabled: !canAlign },
        { handler: alignBottomCommands, icon: <AlignVerticalJustifyEnd size={10} />, title: "Align Bottom", disabled: !canAlign }
      ];
    } else {
      return [
        { handler: alignLeft, icon: <AlignLeft size={10} />, title: "Align Left", disabled: !canAlign },
        { handler: alignCenter, icon: <AlignCenter size={10} />, title: "Align Center", disabled: !canAlign },
        { handler: alignRight, icon: <AlignRight size={10} />, title: "Align Right", disabled: !canAlign },
        { handler: alignTop, icon: <AlignVerticalJustifyStart size={10} />, title: "Align Top", disabled: !canAlign },
        { handler: alignMiddle, icon: <AlignVerticalJustifyCenter size={10} />, title: "Align Middle", disabled: !canAlign },
        { handler: alignBottom, icon: <AlignVerticalJustifyEnd size={10} />, title: "Align Bottom", disabled: !canAlign }
      ];
    }
  };

  const renderButtonRow = (buttons: ButtonConfig[]) => (
    <div style={{ display: 'flex', gap: '2px' }}>
      {buttons.map((button, index) => (
        <div key={index} style={{ flex: 1 }}>
          <IconButton 
            onClick={button.handler} 
            disabled={button.disabled} 
            title={button.title}
          >
            {button.icon}
          </IconButton>
        </div>
      ))}
    </div>
  );

  const distributionButtons = getDistributionButtons();
  const orderButtons = getOrderButtons();
  const alignmentButtons = getAlignmentButtons();

  return (
    <div style={{ 
      backgroundColor: '#fff', 
      padding: '8px 8px 0 8px',
      borderTop: '1px solid #ddd',
      width: '100%'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Row 1: Distribution & Order buttons */}
        {activePlugin === 'edit' ? (
          /* Edit mode has different layout */
          <div style={{ display: 'flex', gap: '2px', justifyContent: 'space-between' }}>
            {renderButtonRow(distributionButtons)}
          </div>
        ) : (
          /* Normal layout for select and subpath modes */
          <div style={{ display: 'flex', gap: '2px' }}>
            {renderButtonRow([...distributionButtons, ...orderButtons])}
          </div>
        )}

        {/* Row 2: Align buttons */}
        {renderButtonRow(alignmentButtons)}
      </div>
    </div>
  );
};