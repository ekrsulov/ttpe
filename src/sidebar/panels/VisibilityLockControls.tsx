import React from 'react';
import { HStack } from '@chakra-ui/react';
import { MousePointer2, Eye, Unlock } from 'lucide-react';
import { PanelActionButton } from '../../ui/PanelActionButton';

interface VisibilityLockControlsProps {
  elementId: string;
  isHidden: boolean;
  isLocked: boolean;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onSelect: (id: string, multiSelect?: boolean) => void;
  showLabel?: string;
  unlockLabel?: string;
  selectLabel?: string;
}

/**
 * Shared component for visibility, lock, and select controls.
 * Used by both SelectPanelItem and SelectPanelGroupItem to ensure
 * consistent behavior and appearance.
 * 
 * Only shows unlock button when locked, view button when hidden, and always shows select button.
 */
export const VisibilityLockControls: React.FC<VisibilityLockControlsProps> = ({
  elementId,
  isHidden,
  isLocked,
  onToggleVisibility,
  onToggleLock,
  onSelect,
  showLabel = 'Show',
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
      {isLocked && (
        <PanelActionButton
          label={unlockLabel}
          icon={Unlock}
          height="auto"
          onClick={() => onToggleLock(elementId)}
        />
      )}
      {isHidden && (
        <PanelActionButton
          label={showLabel}
          icon={Eye}
          height="auto"
          onClick={() => onToggleVisibility(elementId)}
        />
      )}
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
