import { useMemo, useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import {
  Trash2,
  Copy,
  Clipboard,
  Group as GroupIcon,
  Ungroup as UngroupIcon,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlignLeft,
  AlignRight,
  AlignCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  UnfoldHorizontal,
  UnfoldVertical,
  FoldHorizontal,
  FoldVertical,
  ArrowLeftRight,
  ArrowUpDown,
  Triangle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { commandsToString } from '../utils/path';
import { logger } from '../utils';
import { useArrangeHandlers } from './useArrangeHandlers';
import type { FloatingContextMenuAction } from '../types/plugins';
import { duplicateElements } from '../utils/duplicationUtils';
import type { SelectionContextInfo } from '../types/selection';
import { pluginManager } from '../utils/pluginManager';

/**
 * Hook to determine the selection context and provide appropriate actions
 * for the floating context menu.
 */
export function useFloatingContextMenuActions(
  context: SelectionContextInfo | null
): FloatingContextMenuAction[] {
  // Get store actions
  const deleteSelectedElements = useCanvasStore(state => state.deleteSelectedElements);
  const deleteSelectedSubpaths = useCanvasStore(state => state.deleteSelectedSubpaths);
  const deleteSelectedCommands = useCanvasStore(state => state.deleteSelectedCommands);
  const createGroupFromSelection = useCanvasStore(state => state.createGroupFromSelection);
  const ungroupSelectedGroups = useCanvasStore(state => state.ungroupSelectedGroups);
  const ungroupGroupById = useCanvasStore(state => state.ungroupGroupById);
  const toggleGroupVisibility = useCanvasStore(state => state.toggleGroupVisibility);
  const toggleGroupLock = useCanvasStore(state => state.toggleGroupLock);
  const toggleElementVisibility = useCanvasStore(state => state.toggleElementVisibility);
  const toggleElementLock = useCanvasStore(state => state.toggleElementLock);
  const convertCommandType = useCanvasStore(state => state.convertCommandType);

  // Get path operations and element states for conditional logic
  const elements = useCanvasStore(state => state.elements);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const selectedCommands = useCanvasStore(state => state.selectedCommands);
  const hiddenElementIds = useCanvasStore(state => state.hiddenElementIds);
  const lockedElementIds = useCanvasStore(state => state.lockedElementIds);

  // Subscribe to enabledPlugins to trigger re-render when plugins are toggled
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useCanvasStore(state => (state as any).pluginManager?.enabledPlugins ?? []);

  // Get arrange handlers (context-aware)
  const arrangeHandlers = useArrangeHandlers();

  // Helper to check if element is hidden/locked
  const isElementHidden = useCallback((id: string) => {
    return (hiddenElementIds ?? []).includes(id);
  }, [hiddenElementIds]);

  const isElementLocked = useCallback((id: string) => {
    return (lockedElementIds ?? []).includes(id);
  }, [lockedElementIds]);

  // Helper to check if group is hidden/locked
  const isGroupHidden = useCallback((groupId: string) => {
    const group = elements.find(el => el.id === groupId && el.type === 'group');
    return group?.type === 'group' ? group.data.isHidden : false;
  }, [elements]);

  const isGroupLocked = useCallback((groupId: string) => {
    const group = elements.find(el => el.id === groupId && el.type === 'group');
    return group?.type === 'group' ? group.data.isLocked : false;
  }, [elements]);

  // Helper to check if selection contains any groups
  const hasGroupsInSelection = useCallback((ids: string[]) => {
    return ids.some(id => {
      const element = elements.find(el => el.id === id);
      return element?.type === 'group';
    });
  }, [elements]);

  const addElement = useCanvasStore(state => state.addElement);
  const updateElement = useCanvasStore(state => state.updateElement);

  // Duplicate action - uses shared duplication utility for consistent behavior
  const handleDuplicate = useCallback(() => {
    if (!context) return;

    const elementMap = new Map(elements.map(el => [el.id, el]));

    if (context.type === 'path' && context.elementId) {
      // Use smart offset calculation for single path
      duplicateElements([context.elementId], elementMap, addElement, updateElement);
    } else if (context.type === 'group' && context.groupId) {
      // Use smart offset calculation for single group
      duplicateElements([context.groupId], elementMap, addElement, updateElement);
    } else if (context.type === 'multiselection' && context.elementIds) {
      // Use smart offset calculation for multiselection
      duplicateElements(context.elementIds, elementMap, addElement, updateElement);
    } else if (context.type === 'subpath' && context.subpathInfo) {
      const { elementId, subpathIndex } = context.subpathInfo;
      const element = elementMap.get(elementId);

      if (element && element.type === 'path') {
        const pathData = element.data as import('../types').PathData;
        const subpath = pathData.subPaths[subpathIndex];

        if (subpath) {
          addElement({
            type: 'path',
            data: {
              ...pathData,
              subPaths: [subpath],
            },
          });
        }
      }
    }
  }, [context, elements, addElement, updateElement]);

  // Copy to clipboard action
  const handleCopyToClipboard = useCallback(async () => {
    if (!context) return;

    let commands = null;

    if (context.type === 'path' && context.elementId) {
      const element = elements.find(el => el.id === context.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as import('../types').PathData;
        commands = pathData.subPaths.flat();
      }
    } else if (context.type === 'subpath' && context.subpathInfo) {
      const { elementId, subpathIndex } = context.subpathInfo;
      const element = elements.find(el => el.id === elementId);

      if (element && element.type === 'path') {
        const pathData = element.data as import('../types').PathData;
        commands = pathData.subPaths[subpathIndex];
      }
    }

    if (commands) {
      const pathData = commandsToString(commands);
      try {
        await navigator.clipboard.writeText(pathData);
        logger.info('Path copied to clipboard', pathData);
      } catch (err) {
        logger.error('Failed to copy path to clipboard', err);
      }
    }
  }, [context, elements]);

  /**
   * Helper to find the topmost parent group for an element.
   * If element belongs to nested groups, returns the root group.
   * If element has no parent, returns the element itself.
   */
  const findTopMostGroupForElement = useCallback((elementId: string): string => {
    const elementMap = new Map(elements.map(el => [el.id, el]));
    const element = elementMap.get(elementId);

    if (!element) return elementId;

    // If element has no parent, it's already at top level
    if (!element.parentId) {
      return elementId;
    }

    // Walk up the hierarchy to find the topmost group
    let topMostId = elementId;
    let currentParentId: string | null | undefined = element.parentId;

    while (currentParentId) {
      const parent = elementMap.get(currentParentId);
      if (!parent) break;

      topMostId = parent.id;
      currentParentId = parent.parentId;
    }

    return topMostId;
  }, [elements]);

  // Hide selected elements action
  // For elements that belong to groups, applies hide to the topmost parent group
  const handleHideSelected = useCallback(() => {
    if (!context || context.type !== 'multiselection' || !context.elementIds) return;

    // Track which IDs we've already processed to avoid duplicates
    const processedIds = new Set<string>();

    context.elementIds.forEach(id => {
      // Find the topmost group for this element
      const topMostId = findTopMostGroupForElement(id);

      // Skip if we've already processed this top-level element/group
      if (processedIds.has(topMostId)) return;
      processedIds.add(topMostId);

      const element = elements.find(el => el.id === topMostId);
      if (element) {
        if (element.type === 'group') {
          toggleGroupVisibility(topMostId);
        } else if (element.type === 'path') {
          toggleElementVisibility(topMostId);
        }
      }
    });
  }, [context, elements, toggleElementVisibility, toggleGroupVisibility, findTopMostGroupForElement]);

  // Lock selected elements action
  // For elements that belong to groups, applies lock to the topmost parent group
  const handleLockSelected = useCallback(() => {
    if (!context || context.type !== 'multiselection' || !context.elementIds) return;

    // Track which IDs we've already processed to avoid duplicates
    const processedIds = new Set<string>();

    context.elementIds.forEach(id => {
      // Find the topmost group for this element
      const topMostId = findTopMostGroupForElement(id);

      // Skip if we've already processed this top-level element/group
      if (processedIds.has(topMostId)) return;
      processedIds.add(topMostId);

      const element = elements.find(el => el.id === topMostId);
      if (element) {
        if (element.type === 'group') {
          toggleGroupLock(topMostId);
        } else if (element.type === 'path') {
          toggleElementLock(topMostId);
        }
      }
    });
  }, [context, elements, toggleElementLock, toggleGroupLock, findTopMostGroupForElement]);

  // Helper to generate arrange actions based on selection count
  const getArrangeActions = useCallback((): FloatingContextMenuAction[] => {
    // Determine count based on context type
    let count = 0;
    if (context?.type === 'subpath') {
      count = selectedSubpaths?.length ?? 0;
    } else if (context?.type === 'point-anchor-m' || context?.type === 'point-anchor-l' ||
      context?.type === 'point-anchor-c' || context?.type === 'point-control') {
      count = selectedCommands?.length ?? 0;
    } else {
      count = selectedIds.length;
    }

    const canAlign = count >= 2;
    const canDistribute = count >= 3;

    const actions: FloatingContextMenuAction[] = [];

    if (canAlign) {
      // Alignment submenu
      const alignActions: FloatingContextMenuAction[] = [
        { id: 'align-left', label: 'Align Left', icon: AlignLeft, onClick: arrangeHandlers.alignLeft },
        { id: 'align-center', label: 'Align Center', icon: AlignCenter, onClick: arrangeHandlers.alignCenter },
        { id: 'align-right', label: 'Align Right', icon: AlignRight, onClick: arrangeHandlers.alignRight },
        { id: 'align-top', label: 'Align Top', icon: AlignVerticalJustifyStart, onClick: arrangeHandlers.alignTop },
        { id: 'align-middle', label: 'Align Middle', icon: AlignVerticalJustifyCenter, onClick: arrangeHandlers.alignMiddle },
        { id: 'align-bottom', label: 'Align Bottom', icon: AlignVerticalJustifyEnd, onClick: arrangeHandlers.alignBottom }
      ];

      actions.push({
        id: 'align-menu',
        label: 'Align',
        icon: AlignCenter,
        submenu: alignActions
      });

      // Match size submenu (only for elements and subpaths, not for commands/points)
      if (context?.type !== 'point-anchor-m' && context?.type !== 'point-anchor-l' &&
        context?.type !== 'point-anchor-c' && context?.type !== 'point-control') {
        const matchActions: FloatingContextMenuAction[] = [
          { id: 'match-width-largest', label: 'Width (Largest)', icon: UnfoldHorizontal, onClick: arrangeHandlers.matchWidthToLargest },
          { id: 'match-height-largest', label: 'Height (Largest)', icon: UnfoldVertical, onClick: arrangeHandlers.matchHeightToLargest },
          { id: 'match-width-smallest', label: 'Width (Smallest)', icon: FoldHorizontal, onClick: arrangeHandlers.matchWidthToSmallest },
          { id: 'match-height-smallest', label: 'Height (Smallest)', icon: FoldVertical, onClick: arrangeHandlers.matchHeightToSmallest }
        ];

        actions.push({
          id: 'match-menu',
          label: 'Match',
          icon: UnfoldHorizontal,
          submenu: matchActions
        });
      }
    }

    if (canDistribute) {
      // Distribution submenu
      const distributeActions: FloatingContextMenuAction[] = [
        { id: 'distribute-h', label: 'Horizontally', icon: ArrowLeftRight, onClick: arrangeHandlers.distributeHorizontally },
        { id: 'distribute-v', label: 'Vertically', icon: ArrowUpDown, onClick: arrangeHandlers.distributeVertically }
      ];

      actions.push({
        id: 'distribute-menu',
        label: 'Distribute',
        icon: ArrowLeftRight,
        submenu: distributeActions
      });
    }

    // Order submenu (only for elements and subpaths, not for commands)
    if (count > 0 && context?.type !== 'point-anchor-m' && context?.type !== 'point-anchor-l' &&
      context?.type !== 'point-anchor-c' && context?.type !== 'point-control') {
      const orderActions: FloatingContextMenuAction[] = [
        { id: 'bring-front', label: 'Bring to Front', icon: Triangle, onClick: arrangeHandlers.bringToFront },
        { id: 'send-forward', label: 'Send Forward', icon: ChevronUp, onClick: arrangeHandlers.sendForward },
        { id: 'send-backward', label: 'Send Backward', icon: ChevronDown, onClick: arrangeHandlers.sendBackward },
        { id: 'send-back', label: 'Send to Back', icon: Triangle, onClick: arrangeHandlers.sendToBack }
      ];

      actions.push({
        id: 'order-menu',
        label: 'Order',
        icon: Triangle,
        submenu: orderActions
      });
    }

    return actions;
  }, [selectedIds, selectedSubpaths, selectedCommands, arrangeHandlers, context]);

  // Helper to collect actions from plugins
  const getPluginActions = useCallback((): FloatingContextMenuAction[] => {
    if (!context) return [];

    const actions: FloatingContextMenuAction[] = [];

    // Use getRegisteredTools() which filters by enabled/disabled state
    pluginManager.getRegisteredTools().forEach(plugin => {
      if (plugin.contextMenuActions) {
        plugin.contextMenuActions.forEach(contribution => {
          const action = contribution.action(context);
          if (action) {
            actions.push(action);
          }
        });
      }
    });

    return actions;
  }, [context]);

  const actions = useMemo<FloatingContextMenuAction[]>(() => {
    if (!context) return [];

    switch (context.type) {
      case 'multiselection': {
        const arrangeActions = getArrangeActions();
        const pluginActions = getPluginActions();

        return [
          // Arrange actions (alignment, distribution, match, order)
          ...arrangeActions,
          // Plugin contributed actions
          ...pluginActions,
          // Standard actions
          {
            id: 'group',
            label: 'Group',
            icon: GroupIcon,
            onClick: () => createGroupFromSelection(),
            isDisabled: selectedIds.length < 2,
          },
          // Only show Ungroup if there are groups in selection
          ...(hasGroupsInSelection(selectedIds) ? [{
            id: 'ungroup',
            label: 'Ungroup',
            icon: UngroupIcon,
            onClick: () => ungroupSelectedGroups(),
          }] : []),
          {
            id: 'lock',
            label: 'Lock',
            icon: Lock,
            onClick: handleLockSelected,
          },
          {
            id: 'hide',
            label: 'Hide',
            icon: EyeOff,
            onClick: handleHideSelected,
          },
          {
            id: 'duplicate',
            label: 'Duplicate',
            icon: Copy,
            onClick: handleDuplicate,
          },
          {
            id: 'copy',
            label: 'Copy to Clipboard',
            icon: Clipboard,
            onClick: handleCopyToClipboard,
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: Trash2,
            onClick: () => deleteSelectedElements(),
            variant: 'danger',
          },
        ];
      }

      case 'group': {
        const groupId = context.groupId!;
        const isHidden = isGroupHidden(groupId);
        const isLocked = isGroupLocked(groupId);
        const arrangeActions = getArrangeActions();
        const pluginActions = getPluginActions();

        return [
          // Arrange actions
          ...arrangeActions,
          // Plugin contributed actions
          ...pluginActions,
          // Standard actions
          {
            id: 'ungroup',
            label: 'Ungroup',
            icon: UngroupIcon,
            onClick: () => ungroupGroupById(groupId),
            isDisabled: isLocked,
          },
          {
            id: 'lock',
            label: isLocked ? 'Unlock' : 'Lock',
            icon: isLocked ? Unlock : Lock,
            onClick: () => toggleGroupLock(groupId),
          },
          {
            id: 'visibility',
            label: isHidden ? 'Show' : 'Hide',
            icon: isHidden ? Eye : EyeOff,
            onClick: () => toggleGroupVisibility(groupId),
          },
          {
            id: 'duplicate',
            label: 'Duplicate',
            icon: Copy,
            onClick: handleDuplicate,
          },
          {
            id: 'copy',
            label: 'Copy to Clipboard',
            icon: Clipboard,
            onClick: handleCopyToClipboard,
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: Trash2,
            onClick: () => deleteSelectedElements(),
            variant: 'danger',
          },
        ];
      }

      case 'path': {
        const elementId = context.elementId!;
        const isHidden = isElementHidden(elementId);
        const isLocked = isElementLocked(elementId);
        const arrangeActions = getArrangeActions();
        const pluginActions = getPluginActions();

        return [
          // Arrange actions
          ...arrangeActions,
          // Plugin contributed actions
          ...pluginActions,
          // Standard actions
          {
            id: 'group',
            label: 'Group',
            icon: GroupIcon,
            onClick: () => createGroupFromSelection(),
            isDisabled: selectedIds.length < 2,
          },
          {
            id: 'lock',
            label: isLocked ? 'Unlock' : 'Lock',
            icon: isLocked ? Unlock : Lock,
            onClick: () => toggleElementLock(elementId),
          },
          {
            id: 'visibility',
            label: isHidden ? 'Show' : 'Hide',
            icon: isHidden ? Eye : EyeOff,
            onClick: () => toggleElementVisibility(elementId),
          },
          {
            id: 'duplicate',
            label: 'Duplicate',
            icon: Copy,
            onClick: handleDuplicate,
          },
          {
            id: 'copy',
            label: 'Copy to Clipboard',
            icon: Clipboard,
            onClick: handleCopyToClipboard,
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: Trash2,
            onClick: () => deleteSelectedElements(),
            variant: 'danger',
          },
        ];
      }

      case 'subpath': {
        const arrangeActions = getArrangeActions();
        const pluginActions = getPluginActions();

        return [
          // Arrange actions
          ...arrangeActions,
          // Plugin contributed actions
          ...pluginActions,
          // Standard actions
          {
            id: 'duplicate',
            label: 'Duplicate',
            icon: Copy,
            onClick: handleDuplicate,
          },
          {
            id: 'copy',
            label: 'Copy to Clipboard',
            icon: Clipboard,
            onClick: handleCopyToClipboard,
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: Trash2,
            onClick: () => deleteSelectedSubpaths?.(),
            variant: 'danger',
          },
        ];
      }

      case 'point-anchor-m':
      case 'point-anchor-l':
      case 'point-anchor-c':
      case 'point-control': {
        const arrangeActions = getArrangeActions();
        const pluginActions = getPluginActions();

        return [
          // Arrange actions (alignment and distribution apply to points)
          ...arrangeActions,
          // Plugin contributed actions (edit plugin handles point actions)
          ...pluginActions,
        ];
      }
      default:
        return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    context,
    selectedIds,
    elements,
    createGroupFromSelection,
    ungroupSelectedGroups,
    ungroupGroupById,
    toggleGroupVisibility,
    toggleGroupLock,
    toggleElementVisibility,
    toggleElementLock,
    deleteSelectedElements,
    deleteSelectedSubpaths,
    deleteSelectedCommands,
    convertCommandType,
    handleDuplicate,
    handleCopyToClipboard,
    isGroupHidden,
    isGroupLocked,
    isElementHidden,
    isElementLocked,
    getArrangeActions,
    getPluginActions,
    hasGroupsInSelection,
    handleHideSelected,
    handleLockSelected,
  ]);

  return actions;
}
