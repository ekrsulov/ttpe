import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useArrangeHandlers } from '../../hooks/useArrangeHandlers';
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
    getSelectedSubpathsCount,
  } = useCanvasStore();

  const currentHandlers = useArrangeHandlers();

  const selectedCount = selectedIds.length;
  const selectedCommandsCount = selectedCommands.length;
  const selectedSubpathsCount = getSelectedSubpathsCount();
  const canAlign = selectedCount >= 2 ||
    (activePlugin === 'edit' && selectedCommandsCount >= 2) ||
    (activePlugin === 'subpath' && selectedSubpathsCount >= 2);
  const canDistribute = selectedCount >= 3 ||
    (activePlugin === 'edit' && selectedCommandsCount >= 3) ||
    (activePlugin === 'subpath' && selectedSubpathsCount >= 3);

  // Button configurations - now using the consolidated handlers
  const distributionButtons: ButtonConfig[] = [
    { handler: currentHandlers.distributeHorizontally, icon: <MoveHorizontal size={10} />, title: "Distribute Horizontally", disabled: !canDistribute },
    { handler: currentHandlers.distributeVertically, icon: <MoveVertical size={10} />, title: "Distribute Vertically", disabled: !canDistribute }
  ];

  const orderButtons: ButtonConfig[] = activePlugin === 'edit' ? [] : [
    { handler: currentHandlers.bringToFront, icon: <Triangle size={10} />, title: `Bring ${activePlugin === 'subpath' ? 'Subpath' : ''} to Front`, disabled: activePlugin === 'subpath' ? selectedSubpathsCount === 0 : selectedCount === 0 },
    { handler: currentHandlers.sendForward, icon: <ChevronUp size={10} />, title: `Send ${activePlugin === 'subpath' ? 'Subpath' : ''} Forward`, disabled: activePlugin === 'subpath' ? selectedSubpathsCount === 0 : selectedCount === 0 },
    { handler: currentHandlers.sendBackward, icon: <ChevronDown size={10} />, title: `Send ${activePlugin === 'subpath' ? 'Subpath' : ''} Backward`, disabled: activePlugin === 'subpath' ? selectedSubpathsCount === 0 : selectedCount === 0 },
    { handler: currentHandlers.sendToBack, icon: <Triangle size={10} style={{ transform: 'rotate(180deg)' }} />, title: `Send ${activePlugin === 'subpath' ? 'Subpath' : ''} to Back`, disabled: activePlugin === 'subpath' ? selectedSubpathsCount === 0 : selectedCount === 0 }
  ];

  const alignmentButtons: ButtonConfig[] = [
    { handler: currentHandlers.alignLeft, icon: <AlignLeft size={10} />, title: "Align Left", disabled: !canAlign },
    { handler: currentHandlers.alignCenter, icon: <AlignCenter size={10} />, title: "Align Center", disabled: !canAlign },
    { handler: currentHandlers.alignRight, icon: <AlignRight size={10} />, title: "Align Right", disabled: !canAlign },
    { handler: currentHandlers.alignTop, icon: <AlignVerticalJustifyStart size={10} />, title: "Align Top", disabled: !canAlign },
    { handler: currentHandlers.alignMiddle, icon: <AlignVerticalJustifyCenter size={10} />, title: "Align Middle", disabled: !canAlign },
    { handler: currentHandlers.alignBottom, icon: <AlignVerticalJustifyEnd size={10} />, title: "Align Bottom", disabled: !canAlign }
  ];

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