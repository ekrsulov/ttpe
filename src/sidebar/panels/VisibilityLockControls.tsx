import React from 'react';
import { HStack } from '@chakra-ui/react';
import { MousePointer2, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { PanelActionButton } from '../../ui/PanelActionButton';

interface VisibilityLockControlsProps {
  elementId: string;
  isHidden: boolean;
  isLocked: boolean;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onSelect: (id: string, multiSelect?: boolean) => void;
  hideLabel?: string;
  showLabel?: string;
  lockLabel?: string;
  unlockLabel?: string;
  selectLabel?: string;
}

/**
 * Shared component for visibility, lock, and select controls.
 * Used by both SelectPanelItem and SelectPanelGroupItem to ensure
 * consistent behavior and appearance.
 */
export const VisibilityLockControls: React.FC<VisibilityLockControlsProps> = ({
  elementId,
  isHidden,
  isLocked,
  onToggleVisibility,
  onToggleLock,
  onSelect,
  hideLabel = 'Hide',
  showLabel = 'Show',
  lockLabel = 'Lock',
  unlockLabel = 'Unlock',
  selectLabel = 'Select',
}) => {
  const handleSelectClick = (e?: React.MouseEvent) => {
    // Check if shift key is pressed (physical or will be combined with virtual shift in the parent)
    const multiSelect = e?.shiftKey ?? false;
    onSelect(elementId, multiSelect);
  };

  return (
    <HStack spacing={1}>
      <PanelActionButton
        label={isLocked ? unlockLabel : lockLabel}
        icon={isLocked ? Unlock : Lock}
        height="auto"
        onClick={() => onToggleLock(elementId)}
      />
      <PanelActionButton
        label={isHidden ? showLabel : hideLabel}
        icon={isHidden ? Eye : EyeOff}
        height="auto"
        onClick={() => onToggleVisibility(elementId)}
      />
      <PanelActionButton
        label={selectLabel}
        icon={MousePointer2}
        height="auto"
        onClick={handleSelectClick}
        isDisabled={isLocked || isHidden}
      />
    </HStack>
  );
};
