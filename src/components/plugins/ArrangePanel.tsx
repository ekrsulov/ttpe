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

interface ButtonConfig {
  handler: () => void;
  icon: React.ReactElement;
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
    <Box bg="white" px={2} pt={2} borderTop="1px solid" borderColor="gray.300" w="full">
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