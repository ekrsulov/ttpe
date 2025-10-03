import React from 'react';
import { Box, Flex, IconButton, Divider } from '@chakra-ui/react';
import { ArrangePanel } from '../plugins/ArrangePanel';
import { SelectPanel } from '../plugins/SelectPanel';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

interface SidebarFooterProps {
  isArrangeExpanded: boolean;
  setIsArrangeExpanded: (expanded: boolean) => void;
}

/**
 * Fixed footer section of the sidebar containing ArrangePanel and SelectPanel
 */
export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  isArrangeExpanded,
  setIsArrangeExpanded,
}) => {
  const { selectedIds, selectedCommands, selectedSubpaths } = useCanvasStore();
  
  // Show panels only when something is selected (elements, commands, or subpaths)
  const hasSelection = selectedIds.length > 0 || selectedCommands.length > 0 || selectedSubpaths.length > 0;
  
  if (!hasSelection) {
    return null;
  }

  return (
    <Box
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      bg="white"
      zIndex={1001}
      display="flex"
      flexDirection="column"
    >
      {isArrangeExpanded && <ArrangePanel />}

      {/* Expand/Collapse Divider with Button */}
      <Flex position="relative" my={1} align="center">
        <Divider />
        <IconButton
          aria-label={isArrangeExpanded ? "Collapse Arrange" : "Expand Arrange"}
          icon={isArrangeExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          onClick={() => setIsArrangeExpanded(!isArrangeExpanded)}
          size="xs"
          variant="outline"
          borderRadius="full"
          bg="white"
          position="absolute"
          left="50%"
          transform="translateX(-50%)"
          minW="24px"
          h="24px"
        />
      </Flex>

      <SelectPanel />
    </Box>
  );
};