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
  MoveVertical,
  ArrowLeftRight,
  ArrowUpDown
} from 'lucide-react';
import { VStack, HStack, IconButton as ChakraIconButton, Box } from '@chakra-ui/react';
import ConditionalTooltip from '../ui/ConditionalTooltip';
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
  const selectedCommandsCount = useCanvasStore(state => state.selectedCommands?.length ?? 0);
  const selectedSubpathsCount = useCanvasStore(state => state.selectedSubpaths?.length ?? 0);
  
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
    { handler: currentHandlers.distributeHorizontally, icon: <ArrowLeftRight size={12} />, title: "Distribute Horizontally", disabled: !canDistribute },
    { handler: currentHandlers.distributeVertically, icon: <ArrowUpDown size={12} />, title: "Distribute Vertically", disabled: !canDistribute }
  ];

  const sizeMatchButtons: ButtonConfig[] = [
    { handler: currentHandlers.matchWidthToLargest, icon: <MoveHorizontal size={12} />, title: "Match Width to Largest", disabled: !canAlign },
    { handler: currentHandlers.matchHeightToLargest, icon: <MoveVertical size={12} />, title: "Match Height to Largest", disabled: !canAlign }
  ];

  const orderButtons: ButtonConfig[] = activePlugin === 'edit' ? [] : [
    { handler: currentHandlers.bringToFront, icon: <Triangle size={12} />, title: `Bring ${activePlugin === 'subpath' ? 'Subpath' : ''} to Front`, disabled: activePlugin === 'subpath' ? selectedSubpathsCount === 0 : selectedCount === 0 },
    { handler: currentHandlers.sendForward, icon: <ChevronUp size={12} />, title: `Send ${activePlugin === 'subpath' ? 'Subpath' : ''} Forward`, disabled: activePlugin === 'subpath' ? selectedSubpathsCount === 0 : selectedCount === 0 },
    { handler: currentHandlers.sendBackward, icon: <ChevronDown size={12} />, title: `Send ${activePlugin === 'subpath' ? 'Subpath' : ''} Backward`, disabled: activePlugin === 'subpath' ? selectedSubpathsCount === 0 : selectedCount === 0 },
    { handler: currentHandlers.sendToBack, icon: <Triangle size={12} style={{ transform: 'rotate(180deg)' }} />, title: `Send ${activePlugin === 'subpath' ? 'Subpath' : ''} to Back`, disabled: activePlugin === 'subpath' ? selectedSubpathsCount === 0 : selectedCount === 0 }
  ];

  const alignmentButtons: ButtonConfig[] = [
    { handler: currentHandlers.alignLeft, icon: <AlignLeft size={12} />, title: "Align Left", disabled: !canAlign },
    { handler: currentHandlers.alignCenter, icon: <AlignCenter size={12} />, title: "Align Center", disabled: !canAlign },
    { handler: currentHandlers.alignRight, icon: <AlignRight size={12} />, title: "Align Right", disabled: !canAlign },
    { handler: currentHandlers.alignTop, icon: <AlignVerticalJustifyStart size={12} />, title: "Align Top", disabled: !canAlign },
    { handler: currentHandlers.alignMiddle, icon: <AlignVerticalJustifyCenter size={12} />, title: "Align Middle", disabled: !canAlign },
    { handler: currentHandlers.alignBottom, icon: <AlignVerticalJustifyEnd size={12} />, title: "Align Bottom", disabled: !canAlign }
  ];

  const renderButtonRow = (buttons: ButtonConfig[]) => (
    <HStack spacing={0.5} w="full">
      {buttons.map((button, index) => (
        <ConditionalTooltip key={index} label={button.title}>
          <ChakraIconButton
            aria-label={button.title}
            icon={button.icon}
            onClick={button.handler}
            isDisabled={button.disabled}
            size="xs"
            flex={1}
            variant="ghost"
            bg="transparent"
          />
        </ConditionalTooltip>
      ))}
    </HStack>
  );

  return (
    <Box bg="white" px={2} pt={2} borderTop="1px solid" borderColor="gray.300" w="full" position="relative">
      <RenderCountBadgeWrapper componentName="ArrangePanel" position="top-right" />
      <VStack spacing={1} align="stretch">
        {/* Row 2: Align buttons and Match Height button (hide match button in edit mode) */}
        {activePlugin === 'edit' 
          ? renderButtonRow(alignmentButtons)
          : renderButtonRow([...alignmentButtons, sizeMatchButtons[1]])
        }

        {/* Row 1: Distribution, Order, and Match Width buttons */}
        {activePlugin === 'edit' ? (
          /* Edit mode has different layout - no order or match buttons */
          <HStack spacing={0.5} justify="space-between">
            {renderButtonRow(distributionButtons)}
          </HStack>
        ) : (
          /* Normal layout for select and subpath modes */
          <HStack spacing={0.5}>
            {renderButtonRow([...distributionButtons, ...orderButtons, sizeMatchButtons[0]])}
          </HStack>
        )}
      </VStack>
    </Box>
  );
};

// Export memoized version - only re-renders when props change (no props = never re-renders from parent)
// Component only re-renders internally when useArrangeHandlers changes (activePlugin)
export const ArrangePanel = React.memo(ArrangePanelComponent);