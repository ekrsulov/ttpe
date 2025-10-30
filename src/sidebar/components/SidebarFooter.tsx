import React from 'react';
import { Box, Flex, IconButton, Divider } from '@chakra-ui/react';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { ArrangePanel } from '../panels/ArrangePanel';
import { SelectPanel } from '../panels/SelectPanel';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { useSidebarFooterHeight } from '../../hooks/useSidebarFooterHeight';

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
  // Use shared hook for managing footer height CSS variable
  const footerRef = useSidebarFooterHeight();

  // Subscribe to individual selection state to avoid unnecessary re-renders
  const hasSelectedIds = useCanvasStore(state => state.selectedIds.length > 0);
  const hasSelectedCommands = useCanvasStore(state => (state.selectedCommands?.length ?? 0) > 0);
  const hasSelectedSubpaths = useCanvasStore(state => (state.selectedSubpaths?.length ?? 0) > 0);
  
  const hasSelection = hasSelectedIds || hasSelectedCommands || hasSelectedSubpaths;

  return (
    <Box
      ref={footerRef}
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      bg="white"
      zIndex={1001}
      display="flex"
      flexDirection="column"
    >
      {hasSelection && isArrangeExpanded && <ArrangePanel />}

      {hasSelection && (
        <Flex position="relative" my={1} align="center">
          <Divider />
          <ConditionalTooltip label={isArrangeExpanded ? "Collapse Arrange" : "Expand Arrange"}>
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
          </ConditionalTooltip>
        </Flex>
      )}

      <SelectPanel />
    </Box>
  );
};