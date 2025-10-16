import React, { useEffect, useRef } from 'react';
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
  const footerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = footerRef.current;
    if (!node) {
      return;
    }

    const updateHeightVariable = () => {
      document.documentElement.style.setProperty('--sidebar-footer-height', `${node.offsetHeight}px`);
    };

    updateHeightVariable();

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        document.documentElement.style.removeProperty('--sidebar-footer-height');
      };
    }

    const resizeObserver = new ResizeObserver(updateHeightVariable);
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
      document.documentElement.style.removeProperty('--sidebar-footer-height');
    };
  }, []);

  // Subscribe to individual selection state to avoid unnecessary re-renders
  const hasSelectedIds = useCanvasStore(state => state.selectedIds.length > 0);
  const hasSelectedCommands = useCanvasStore(state => state.selectedCommands.length > 0);
  const hasSelectedSubpaths = useCanvasStore(state => state.selectedSubpaths.length > 0);
  
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
      )}

      <SelectPanel />
    </Box>
  );
};