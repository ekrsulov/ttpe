import React, { useState, useMemo } from 'react';
import { Box, Popover, PopoverTrigger, PopoverContent } from '@chakra-ui/react';
import { MoreVertical } from 'lucide-react';
import { ToolbarIconButton } from './ToolbarIconButton';
import { FloatingContextMenu } from './FloatingContextMenu';
import { useFloatingContextMenuActions } from '../hooks/useFloatingContextMenuActions';
import { useSelectionContext } from '../hooks/useSelectionContext';
import { useCanvasStore } from '../store/canvasStore';
import { pluginManager } from '../utils/pluginManager';

/**
 * Floating Context Menu Button
 * 
 * Button in the bottom action bar that opens a context menu with actions
 * for the currently selected element(s). Replaces the delete button when
 * elements are selected.
 */
export const FloatingContextMenuButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Get selection state - simplified using centralized hook
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedCommands = useCanvasStore(state => state.selectedCommands);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);

  // Get selection mode from the active plugin's behavior flags
  const selectionMode = pluginManager.getActiveSelectionMode();

  // Use centralized selection context hook
  const context = useSelectionContext();

  // Get actions based on selection context
  const actions = useFloatingContextMenuActions(context);

  const hasSelection = context !== null;

  // Count selected items for badge - depends on active plugin's selection mode
  const selectionCount = useMemo(() => {
    if (selectionMode === 'subpaths' && selectedSubpaths && selectedSubpaths.length > 0) {
      return selectedSubpaths.length;
    }
    if (selectionMode === 'commands' && selectedCommands && selectedCommands.length > 0) {
      return selectedCommands.length;
    }
    return selectedIds.length;
  }, [selectionMode, selectedIds, selectedCommands, selectedSubpaths]);

  const handleActionClick = (actionFn?: () => void) => {
    if (actionFn) {
      actionFn();
    }
    setIsOpen(false);
  };

  // Wrap action onClick to close menu after execution
  // Only wrap actions with onClick, preserve submenu actions
  const wrappedActions = actions.map(action => ({
    ...action,
    onClick: action.onClick ? () => handleActionClick(action.onClick) : undefined,
    submenu: action.submenu?.map(subAction => ({
      ...subAction,
      onClick: subAction.onClick ? () => handleActionClick(subAction.onClick) : undefined,
    })),
  }));

  return (
    <Popover
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement="top-end"
      closeOnBlur={true}
      closeOnEsc={true}
    >
      <PopoverTrigger>
        <Box>
          <ToolbarIconButton
            icon={MoreVertical}
            label="Actions"
            onClick={() => setIsOpen(!isOpen)}
            isDisabled={!hasSelection}
            counter={selectionCount}
          />
        </Box>
      </PopoverTrigger>
      <PopoverContent
        width="auto"
        border="none"
        boxShadow="none"
        bg="transparent"
        _focus={{ outline: 'none', boxShadow: 'none' }}
        _focusVisible={{ outline: 'none', boxShadow: 'none' }}
        sx={{
          '&:focus': { outline: 'none !important', boxShadow: 'none !important' },
          '&:focus-visible': { outline: 'none !important', boxShadow: 'none !important' },
          '& > *': { outline: 'none !important' },
          '& *:focus': { outline: 'none !important' },
          '& *:focus-visible': { outline: 'none !important' },
        }}
      >
        <FloatingContextMenu
          actions={wrappedActions}
          isOpen={isOpen}
        />
      </PopoverContent>
    </Popover>
  );
};
