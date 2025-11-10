import React, { useState, useMemo } from 'react';
import { Box, Popover, PopoverTrigger, PopoverContent } from '@chakra-ui/react';
import { MoreVertical } from 'lucide-react';
import { ToolbarIconButton } from './ToolbarIconButton';
import { FloatingContextMenu } from './FloatingContextMenu';
import { useFloatingContextMenuActions, type SelectionContextInfo } from '../hooks/useFloatingContextMenuActions';
import { useCanvasStore } from '../store/canvasStore';
import { extractEditablePoints } from '../utils/pathParserUtils';
import type { PathData } from '../types';

/**
 * Floating Context Menu Button
 * 
 * Button in the bottom action bar that opens a context menu with actions
 * for the currently selected element(s). Replaces the delete button when
 * elements are selected.
 */
export const FloatingContextMenuButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Get selection state
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedCommands = useCanvasStore(state => state.selectedCommands);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const elements = useCanvasStore(state => state.elements);
  const activePlugin = useCanvasStore(state => state.activePlugin);

  // Determine selection context
  const context: SelectionContextInfo | null = useMemo(() => {
    // Priority: commands > subpaths > elements
    if (selectedCommands && selectedCommands.length > 0) {
      // Determine the exact point type
      const cmd = selectedCommands[0];
      const element = elements.find(el => el.id === cmd.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const commands = pathData.subPaths.flat();
        const points = extractEditablePoints(commands);
        const point = points.find(p => p.commandIndex === cmd.commandIndex && p.pointIndex === cmd.pointIndex);
        
        if (point) {
          if (point.isControl) {
            return { type: 'point-control', pointInfo: cmd };
          } else {
            const command = commands[cmd.commandIndex];
            if (command.type === 'M') {
              return { type: 'point-anchor-m', pointInfo: cmd };
            } else if (command.type === 'L') {
              return { type: 'point-anchor-l', pointInfo: cmd };
            } else if (command.type === 'C') {
              return { type: 'point-anchor-c', pointInfo: cmd };
            }
          }
        }
      }
      // Fallback
      return { type: 'point-anchor-m', pointInfo: cmd };
    }

    if (selectedSubpaths && selectedSubpaths.length > 0) {
      return {
        type: 'subpath',
        subpathInfo: selectedSubpaths[0],
      };
    }

    if (selectedIds.length === 1) {
      const element = elements.find(el => el.id === selectedIds[0]);
      if (element?.type === 'group') {
        return { type: 'group', groupId: selectedIds[0] };
      }
      return { type: 'path', elementId: selectedIds[0] };
    }

    if (selectedIds.length > 1) {
      return { type: 'multiselection', elementIds: selectedIds };
    }

    return null;
  }, [selectedCommands, selectedSubpaths, selectedIds, elements]);

  // Get actions based on selection context
  const actions = useFloatingContextMenuActions(context);

  const hasSelection = context !== null;

  // Count selected items for badge - depends on active plugin
  const selectionCount = useMemo(() => {
    if (activePlugin === 'subpath' && selectedSubpaths && selectedSubpaths.length > 0) {
      return selectedSubpaths.length;
    }
    if (activePlugin === 'edit' && selectedCommands && selectedCommands.length > 0) {
      return selectedCommands.length;
    }
    return selectedIds.length;
  }, [activePlugin, selectedIds, selectedCommands, selectedSubpaths]);

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
        _focus={{ outline: 'none' }}
      >
        <FloatingContextMenu 
          actions={wrappedActions} 
          isOpen={isOpen}
        />
      </PopoverContent>
    </Popover>
  );
};
