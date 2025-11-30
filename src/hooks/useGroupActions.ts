import { useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import {
  Group as GroupIcon,
  Ungroup as UngroupIcon,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { FloatingContextMenuAction } from '../types/plugins';
import type { SelectionContextInfo } from '../types/selection';

/**
 * Hook that provides group-related actions for the floating context menu.
 * Handles grouping, ungrouping, visibility, and locking.
 */
export function useGroupActions(context: SelectionContextInfo | null): {
  actions: FloatingContextMenuAction[];
  helpers: {
    isGroupHidden: (groupId: string) => boolean;
    isGroupLocked: (groupId: string) => boolean;
    isElementHidden: (id: string) => boolean;
    isElementLocked: (id: string) => boolean;
    hasGroupsInSelection: (ids: string[]) => boolean;
    findTopMostGroupForElement: (elementId: string) => string;
  };
} {
  const elements = useCanvasStore(state => state.elements);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const hiddenElementIds = useCanvasStore(state => state.hiddenElementIds);
  const lockedElementIds = useCanvasStore(state => state.lockedElementIds);
  const createGroupFromSelection = useCanvasStore(state => state.createGroupFromSelection);
  const ungroupSelectedGroups = useCanvasStore(state => state.ungroupSelectedGroups);
  const ungroupGroupById = useCanvasStore(state => state.ungroupGroupById);
  const toggleGroupVisibility = useCanvasStore(state => state.toggleGroupVisibility);
  const toggleGroupLock = useCanvasStore(state => state.toggleGroupLock);
  const toggleElementVisibility = useCanvasStore(state => state.toggleElementVisibility);
  const toggleElementLock = useCanvasStore(state => state.toggleElementLock);

  // Helper functions
  const isElementHidden = useCallback((id: string) => {
    return (hiddenElementIds ?? []).includes(id);
  }, [hiddenElementIds]);

  const isElementLocked = useCallback((id: string) => {
    return (lockedElementIds ?? []).includes(id);
  }, [lockedElementIds]);

  const isGroupHidden = useCallback((groupId: string) => {
    const group = elements.find(el => el.id === groupId && el.type === 'group');
    return group?.type === 'group' ? group.data.isHidden : false;
  }, [elements]);

  const isGroupLocked = useCallback((groupId: string) => {
    const group = elements.find(el => el.id === groupId && el.type === 'group');
    return group?.type === 'group' ? group.data.isLocked : false;
  }, [elements]);

  const hasGroupsInSelection = useCallback((ids: string[]) => {
    return ids.some(id => {
      const element = elements.find(el => el.id === id);
      return element?.type === 'group';
    });
  }, [elements]);

  const findTopMostGroupForElement = useCallback((elementId: string): string => {
    const elementMap = new Map(elements.map(el => [el.id, el]));
    const element = elementMap.get(elementId);

    if (!element) return elementId;
    if (!element.parentId) return elementId;

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

  // Action handlers
  const handleHideSelected = useCallback(() => {
    if (!context || context.type !== 'multiselection' || !context.elementIds) return;

    const processedIds = new Set<string>();
    context.elementIds.forEach(id => {
      const topMostId = findTopMostGroupForElement(id);
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

  const handleLockSelected = useCallback(() => {
    if (!context || context.type !== 'multiselection' || !context.elementIds) return;

    const processedIds = new Set<string>();
    context.elementIds.forEach(id => {
      const topMostId = findTopMostGroupForElement(id);
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

  // Generate actions based on context
  const actions: FloatingContextMenuAction[] = [];

  if (!context) {
    return {
      actions,
      helpers: { isGroupHidden, isGroupLocked, isElementHidden, isElementLocked, hasGroupsInSelection, findTopMostGroupForElement }
    };
  }

  switch (context.type) {
    case 'multiselection': {
      actions.push({
        id: 'group',
        label: 'Group',
        icon: GroupIcon,
        onClick: () => createGroupFromSelection(),
        isDisabled: selectedIds.length < 2,
      });

      if (hasGroupsInSelection(selectedIds)) {
        actions.push({
          id: 'ungroup',
          label: 'Ungroup',
          icon: UngroupIcon,
          onClick: () => ungroupSelectedGroups(),
        });
      }

      actions.push(
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
        }
      );
      break;
    }

    case 'group': {
      const groupId = context.groupId!;
      const isHidden = isGroupHidden(groupId);
      const isLocked = isGroupLocked(groupId);

      actions.push(
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
        }
      );
      break;
    }

    case 'path': {
      const elementId = context.elementId!;
      const isHidden = isElementHidden(elementId);
      const isLocked = isElementLocked(elementId);

      actions.push(
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
        }
      );
      break;
    }
  }

  return {
    actions,
    helpers: { isGroupHidden, isGroupLocked, isElementHidden, isElementLocked, hasGroupsInSelection, findTopMostGroupForElement }
  };
}
