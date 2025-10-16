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
import { VStack, HStack, IconButton as ChakraIconButton, Box } from '@chakra-ui/react';
import { RenderCountBadgeWrapper } from '../ui/RenderCountBadgeWrapper';

interface ButtonConfig {
  handler: () => void;
  icon: React.ReactElement;
  title: string;
  disabled?: boolean;
}

const ArrangePanelComponent: React.FC = () => {
  // Only trigger re-render when activePlugin changes via useArrangeHandlers
  const currentHandlers = useArrangeHandlers();
  
  // Subscribe to selection changes to trigger re-renders
  const selectedCount = useCanvasStore(state => state.selectedIds.length);
  const selectedCommandsCount = useCanvasStore(state => state.selectedCommands.length);
  const selectedSubpathsCount = useCanvasStore(state => state.selectedSubpaths.length);
  const hasLockedSelection = useCanvasStore(state => state.hasLockedSelection());
  
  // Get current state without subscribing - fresh on every render
  const state = useCanvasStore.getState();
  const activePlugin = state.activePlugin;

  const canAlign = selectedCount >= 2 ||
    (activePlugin === 'edit' && selectedCommandsCount >= 2) ||
    (activePlugin === 'subpath' && selectedSubpathsCount >= 2);
  const canDistribute = selectedCount >= 3 ||
    (activePlugin === 'edit' && selectedCommandsCount >= 3) ||
    (activePlugin === 'subpath' && selectedSubpathsCount >= 3);

  // Button configurations - now using the consolidated handlers
  const distributionButtons: ButtonConfig[] = [
    { handler: currentHandlers.distributeHorizontally, icon: <MoveHorizontal size={10} />, title: "Distribute Horizontally", disabled: !canDistribute || hasLockedSelection },
    { handler: currentHandlers.distributeVertically, icon: <MoveVertical size={10} />, title: "Distribute Vertically", disabled: !canDistribute || hasLockedSelection }
  ];

  const orderButtons: ButtonConfig[] = activePlugin === 'edit' ? [] : [
    { handler: currentHandlers.bringToFront, icon: <Triangle size={10} />, title: `Bring ${activePlugin === 'subpath' ? 'Subpath' : ''} to Front`, disabled: (activePlugin === 'subpath' ? selectedSubpathsCount === 0 : selectedCount === 0) || hasLockedSelection },
    { handler: currentHandlers.sendForward, icon: <ChevronUp size={10} />, title: `Send ${activePlugin === 'subpath' ? 'Subpath' : ''} Forward`, disabled: (activePlugin === 'subpath' ? selectedSubpathsCount === 0 : selectedCount === 0) || hasLockedSelection },
    { handler: currentHandlers.sendBackward, icon: <ChevronDown size={10} />, title: `Send ${activePlugin === 'subpath' ? 'Subpath' : ''} Backward`, disabled: (activePlugin === 'subpath' ? selectedSubpathsCount === 0 : selectedCount === 0) || hasLockedSelection },
    { handler: currentHandlers.sendToBack, icon: <Triangle size={10} style={{ transform: 'rotate(180deg)' }} />, title: `Send ${activePlugin === 'subpath' ? 'Subpath' : ''} to Back`, disabled: (activePlugin === 'subpath' ? selectedSubpathsCount === 0 : selectedCount === 0) || hasLockedSelection }
  ];

  const alignmentButtons: ButtonConfig[] = [
    { handler: currentHandlers.alignLeft, icon: <AlignLeft size={10} />, title: "Align Left", disabled: !canAlign || hasLockedSelection },
    { handler: currentHandlers.alignCenter, icon: <AlignCenter size={10} />, title: "Align Center", disabled: !canAlign || hasLockedSelection },
    { handler: currentHandlers.alignRight, icon: <AlignRight size={10} />, title: "Align Right", disabled: !canAlign || hasLockedSelection },
    { handler: currentHandlers.alignTop, icon: <AlignVerticalJustifyStart size={10} />, title: "Align Top", disabled: !canAlign || hasLockedSelection},
    { handler: currentHandlers.alignMiddle, icon: <AlignVerticalJustifyCenter size={10} />, title: "Align Middle", disabled: !canAlign || hasLockedSelection },
    { handler: currentHandlers.alignBottom, icon: <AlignVerticalJustifyEnd size={10} />, title: "Align Bottom", disabled: !canAlign || hasLockedSelection }
  ];
  const renderButtonRow = (buttons: ButtonConfig[]) => (
    <HStack spacing={0.5} w="full">
      {buttons.map((button, index) => (
        <ChakraIconButton
          key={index}
          aria-label={button.title}
          icon={button.icon}
          onClick={button.handler}
          isDisabled={button.disabled}
          size="xs"
          flex={1}
          variant="ghost"
          bg="transparent"
        />
      ))}
    </HStack>
  );

  return (
    <Box bg="white" px={2} pt={2} borderTop="1px solid" borderColor="gray.300" w="full" position="relative">
      <RenderCountBadgeWrapper componentName="ArrangePanel" position="top-right" />
      <VStack spacing={1} align="stretch">
        {/* Row 1: Distribution & Order buttons */}
        {activePlugin === 'edit' ? (
          /* Edit mode has different layout */
          <HStack spacing={0.5} justify="space-between">
            {renderButtonRow(distributionButtons)}
          </HStack>
        ) : (
          /* Normal layout for select and subpath modes */
          <HStack spacing={0.5}>
            {renderButtonRow([...distributionButtons, ...orderButtons])}
          </HStack>
        )}

        {/* Row 2: Align buttons */}
        {renderButtonRow(alignmentButtons)}
      </VStack>
    </Box>
  );
};

// Export memoized version - only re-renders when props change (no props = never re-renders from parent)
// Component only re-renders internally when useArrangeHandlers changes (activePlugin)
export const ArrangePanel = React.memo(ArrangePanelComponent);