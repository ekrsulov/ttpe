import React from 'react';
import { HStack, Box } from '@chakra-ui/react';
import { Menu } from 'lucide-react';
import { FloatingToolbarShell } from './FloatingToolbarShell';
import { ToolbarIconButton } from './ToolbarIconButton';
import { pluginManager } from '../utils/pluginManager';
import { useCanvasStore } from '../store/canvasStore';

interface ExtraToolInfo {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface ExtraToolsBarProps {
  /** Array of extra tools to display */
  extraTools: ExtraToolInfo[];
  /** Current active mode/tool */
  activeMode: string | null;
  /** Active tool highlight background color */
  activeBg: string;
  /** Active tool highlight text color */
  activeColor: string;
  /** Effective sidebar width for positioning */
  sidebarWidth: number;
  /** Whether to show grid rulers (affects positioning) */
  showGridRulers: boolean;
  /** Whether elements are currently being dragged */
  isDraggingElements: boolean;
  /** Callback when a tool is selected */
  onToolSelect: (toolId: string) => void;
}

/**
 * ExtraToolsBar - Secondary toolbar for overflow tools on mobile.
 * Extracted from TopActionBar to reduce complexity.
 */
export const ExtraToolsBar: React.FC<ExtraToolsBarProps> = ({
  extraTools,
  activeMode,
  activeBg: _activeBg,
  activeColor,
  sidebarWidth,
  showGridRulers,
  isDraggingElements,
  onToolSelect,
}) => {
  // Subscribe to selection state to trigger re-render when selection changes
  // This is needed for isToolDisabled to re-evaluate when elements are selected
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const elements = useCanvasStore(state => state.elements);

  if (extraTools.length === 0) {
    return null;
  }

  return (
    <FloatingToolbarShell
      toolbarPosition="top"
      sidebarWidth={sidebarWidth}
      showGridRulers={showGridRulers}
      sx={{
        marginTop: '42px',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <HStack
        spacing={{ base: 0, md: 0 }}
        justify="center"
        position="relative"
      >
        {extraTools.map(({ id, icon: Icon, label }) => {
          // Use subscribed selectedIds and elements to build store snapshot for isDisabled check
          // This ensures re-render when selection changes
          const store = { ...useCanvasStore.getState(), selectedIds, elements };
          const isDisabled = isDraggingElements ? false : pluginManager.isToolDisabled(id, store);

          return (
            <Box
              key={id}
              position="relative"
              zIndex={1}
            >
              <ToolbarIconButton
                icon={Icon ?? Menu}
                label={label}
                onClick={() => onToolSelect(id)}
                variant="ghost"
                colorScheme="gray"
                bg={activeMode === id ? 'transparent' : undefined}
                color={activeMode === id ? activeColor : undefined}
                _hover={activeMode === id ? { bg: 'transparent' } : undefined}
                tooltip={label}
                isDisabled={isDisabled}
                showTooltip={true}
                title={label}
              />
            </Box>
          );
        })}
      </HStack>
    </FloatingToolbarShell>
  );
};
