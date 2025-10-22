import type { StateCreator } from 'zustand';
import type { CanvasElement, GroupData, GroupElement } from '../../../types';
import type { CanvasStore } from '../../canvasStore';

const DEFAULT_GROUP_TRANSFORM: GroupData['transform'] = {
  translateX: 0,
  translateY: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
};

interface GroupSliceHelpers {
  normalizeRootZIndices: (elements: CanvasElement[]) => CanvasElement[];
  hasSelectedAncestor: (element: CanvasElement, selectedIds: Set<string>, map: Map<string, CanvasElement>) => boolean;
  getElementMap: (elements: CanvasElement[]) => Map<string, CanvasElement>;
  collectDescendants: (group: GroupElement, map: Map<string, CanvasElement>) => string[];
}

export interface GroupSlice {
  groupNameCounter: number;
  hiddenElementIds: string[];
  lockedElementIds: string[];
  createGroupFromSelection: (name?: string) => string | null;
  ungroupSelectedGroups: () => void;
  ungroupGroupById: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  setGroupExpanded: (groupId: string, expanded: boolean) => void;
  toggleGroupVisibility: (groupId: string) => void;
  toggleGroupLock: (groupId: string) => void;
  toggleElementVisibility: (elementId: string) => void;
  toggleElementLock: (elementId: string) => void;
  getGroupById: (groupId: string) => GroupElement | null;
  getGroupDescendants: (groupId: string) => string[];
  isElementHidden: (elementId: string) => boolean;
  isElementLocked: (elementId: string) => boolean;
}

const helpers: GroupSliceHelpers = {
  normalizeRootZIndices: (elements) => {
    const rootElements = elements
      .filter((element) => !element.parentId)
      .sort((a, b) => a.zIndex - b.zIndex);

    const zIndexMap = new Map<string, number>();
    rootElements.forEach((element, index) => {
      zIndexMap.set(element.id, index);
    });

    return elements.map((element) =>
      zIndexMap.has(element.id)
        ? { ...element, zIndex: zIndexMap.get(element.id) ?? element.zIndex }
        : element
    );
  },
  hasSelectedAncestor: (element, selectedIds, map) => {
    let currentParent = element.parentId ? map.get(element.parentId) : undefined;
    while (currentParent) {
      if (selectedIds.has(currentParent.id)) {
        return true;
      }
      currentParent = currentParent.parentId ? map.get(currentParent.parentId) : undefined;
    }
    return false;
  },
  getElementMap: (elements) => new Map(elements.map((element) => [element.id, element])),
  collectDescendants: (group, map) => {
    const descendants: string[] = [];
    const queue = [...group.data.childIds];

    while (queue.length > 0) {
      const childId = queue.shift();
      if (!childId) continue;
      descendants.push(childId);
      const childElement = map.get(childId);
      if (childElement && childElement.type === 'group') {
        queue.push(...childElement.data.childIds);
      }
    }

    return descendants;
  },
};

const ungroupGroupInternal = (
  group: GroupElement,
  elements: CanvasElement[],
): { elements: CanvasElement[]; releasedChildIds: string[] } => {
  const childIds = [...group.data.childIds];
  const parentId = group.parentId ?? null;

  let updatedElements = elements.map((element) => {
    if (childIds.includes(element.id)) {
      return { ...element, parentId };
    }
    return element;
  });

  if (parentId) {
    updatedElements = updatedElements.map((element) => {
      if (element.id === parentId && element.type === 'group') {
        const parentData = element.data;
        const newChildIds: string[] = [];
        parentData.childIds.forEach((childId) => {
          if (childId === group.id) {
            newChildIds.push(...childIds);
          } else {
            newChildIds.push(childId);
          }
        });
        return {
          ...element,
          data: {
            ...parentData,
            childIds: newChildIds,
          },
        };
      }
      return element;
    });
  }

  updatedElements = updatedElements.filter((element) => element.id !== group.id);

  return {
    elements: updatedElements,
    releasedChildIds: childIds,
  };
};

export const createGroupSlice: StateCreator<CanvasStore, [], [], GroupSlice> = (set, get) => ({
  groupNameCounter: 1,
  hiddenElementIds: [],
  lockedElementIds: [],
  createGroupFromSelection: (name) => {
    const state = get() as CanvasStore;
    const selectedIds = state.selectedIds;
    if (selectedIds.length < 2) {
      return null;
    }

    const elementMap = helpers.getElementMap(state.elements);
    const normalizedSelection = selectedIds
      .map((id) => elementMap.get(id))
      .filter((element): element is CanvasElement => Boolean(element))
      .filter((element) => !helpers.hasSelectedAncestor(element, new Set(selectedIds), elementMap));

    if (normalizedSelection.length < 2) {
      return null;
    }

    const parentCandidates = new Set(
      normalizedSelection.map((element) => element.parentId ?? null)
    );
    const [parentIdCandidate] = [...parentCandidates];
    const groupParentId = parentCandidates.size === 1 ? parentIdCandidate ?? null : null;

    const parentElement = groupParentId ? elementMap.get(groupParentId) : null;

    let orderedChildIds: string[] = [];
    if (parentElement && parentElement.type === 'group') {
      const selectionSet = new Set(normalizedSelection.map((element) => element.id));
      orderedChildIds = parentElement.data.childIds.filter((childId) => selectionSet.has(childId));
    } else {
      orderedChildIds = normalizedSelection
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((element) => element.id);
    }

    const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const groupName = name?.trim().length ? name.trim() : `Group ${state.groupNameCounter}`;

    set((storeState) => {
      const current = storeState as CanvasStore;
      const selectionSet = new Set(orderedChildIds);

      let updatedElements = current.elements.map((element) =>
        selectionSet.has(element.id) ? { ...element, parentId: groupId } : element
      );

      if (groupParentId) {
        updatedElements = updatedElements.map((element) => {
          if (element.id === groupParentId && element.type === 'group') {
            const parentData = element.data;
            const newChildIds: string[] = [];
            let inserted = false;
            parentData.childIds.forEach((childId) => {
              if (selectionSet.has(childId)) {
                if (!inserted) {
                  newChildIds.push(groupId);
                  inserted = true;
                }
              } else {
                newChildIds.push(childId);
              }
            });
            if (!inserted) {
              newChildIds.push(groupId);
            }
            return {
              ...element,
              data: {
                ...parentData,
                childIds: newChildIds,
              },
            };
          }
          return element;
        });
      }

      const groupElement: GroupElement = {
        id: groupId,
        type: 'group',
        parentId: groupParentId ?? null,
        zIndex: Math.min(...normalizedSelection.map((element) => element.zIndex)),
        data: {
          childIds: orderedChildIds,
          name: groupName,
          isExpanded: true,
          isHidden: false,
          isLocked: false,
          transform: { ...DEFAULT_GROUP_TRANSFORM },
        },
      };

      updatedElements = helpers.normalizeRootZIndices([...updatedElements, groupElement]);

      return {
        elements: updatedElements,
        selectedIds: [groupId],
        groupNameCounter: current.groupNameCounter + 1,
      };
    });

    return groupId;
  },
  ungroupSelectedGroups: () => {
    const state = get() as CanvasStore;
    const elementMap = helpers.getElementMap(state.elements);
    const groupsToUngroup = state.selectedIds
      .map((id) => elementMap.get(id))
      .filter((element): element is GroupElement => element?.type === 'group');

    if (groupsToUngroup.length === 0) {
      return;
    }

    set((storeState) => {
      const current = storeState as CanvasStore;
      let updatedElements = [...current.elements];
      const newSelection: string[] = [];

      groupsToUngroup.forEach((group) => {
        const result = ungroupGroupInternal(group, updatedElements);
        updatedElements = result.elements;
        newSelection.push(...result.releasedChildIds);
      });

      updatedElements = helpers.normalizeRootZIndices(updatedElements);

      return {
        elements: updatedElements,
        selectedIds: newSelection.length > 0 ? Array.from(new Set(newSelection)) : [],
      };
    });
  },
  ungroupGroupById: (groupId) => {
    const state = get() as CanvasStore;
    const elementMap = helpers.getElementMap(state.elements);
    const group = elementMap.get(groupId);

    if (!group || group.type !== 'group') {
      return;
    }

    set((storeState) => {
      const current = storeState as CanvasStore;
      const result = ungroupGroupInternal(group, current.elements);
      const updatedElements = helpers.normalizeRootZIndices(result.elements);

      return {
        elements: updatedElements,
        selectedIds: result.releasedChildIds.length > 0
          ? Array.from(new Set(result.releasedChildIds))
          : [],
      };
    });
  },
  renameGroup: (groupId, name) => {
    const trimmed = name.trim();
    if (!trimmed.length) {
      return;
    }
    set((state) => ({
      elements: state.elements.map((element) => {
        if (element.id === groupId && element.type === 'group') {
          return {
            ...element,
            data: {
              ...element.data,
              name: trimmed,
            },
          };
        }
        return element;
      }),
    }));
  },
  setGroupExpanded: (groupId, expanded) => {
    set((state) => ({
      elements: state.elements.map((element) => {
        if (element.id === groupId && element.type === 'group') {
          return {
            ...element,
            data: {
              ...element.data,
              isExpanded: expanded,
            },
          };
        }
        return element;
      }),
    }));
  },
  toggleGroupVisibility: (groupId) => {
    set((state) => ({
      elements: state.elements.map((element) => {
        if (element.id === groupId && element.type === 'group') {
          return {
            ...element,
            data: {
              ...element.data,
              isHidden: !element.data.isHidden,
            },
          };
        }
        return element;
      }),
    }));
  },
  toggleGroupLock: (groupId) => {
    set((state) => ({
      elements: state.elements.map((element) => {
        if (element.id === groupId && element.type === 'group') {
          return {
            ...element,
            data: {
              ...element.data,
              isLocked: !element.data.isLocked,
            },
          };
        }
        return element;
      }),
    }));
  },
  toggleElementVisibility: (elementId) => {
    const state = get() as CanvasStore;
    const element = state.elements.find((el) => el.id === elementId);
    if (!element || element.type !== 'path') {
      return;
    }

    set((storeState) => {
      const currentState = storeState as CanvasStore;
      const hiddenSet = new Set(currentState.hiddenElementIds ?? []);
      if (hiddenSet.has(elementId)) {
        hiddenSet.delete(elementId);
      } else {
        hiddenSet.add(elementId);
      }

      return {
        hiddenElementIds: Array.from(hiddenSet),
      };
    });
  },
  toggleElementLock: (elementId) => {
    const state = get() as CanvasStore;
    const element = state.elements.find((el) => el.id === elementId);
    if (!element || element.type !== 'path') {
      return;
    }

    set((storeState) => {
      const currentState = storeState as CanvasStore;
      const lockedSet = new Set(currentState.lockedElementIds ?? []);
      if (lockedSet.has(elementId)) {
        lockedSet.delete(elementId);
      } else {
        lockedSet.add(elementId);
      }

      return {
        lockedElementIds: Array.from(lockedSet),
      };
    });
  },
  getGroupById: (groupId) => {
    const state = get() as CanvasStore;
    const element = state.elements.find((el) => el.id === groupId);
    return element && element.type === 'group' ? element : null;
  },
  getGroupDescendants: (groupId) => {
    const state = get() as CanvasStore;
    const elementMap = helpers.getElementMap(state.elements);
    const element = elementMap.get(groupId);
    if (!element || element.type !== 'group') {
      return [];
    }
    return helpers.collectDescendants(element, elementMap);
  },
  isElementHidden: (elementId) => {
    const state = get() as CanvasStore;
    const directHiddenIds = new Set(state.hiddenElementIds ?? []);
    if (directHiddenIds.has(elementId)) {
      return true;
    }
    const elementMap = helpers.getElementMap(state.elements);
    let current = elementMap.get(elementId);
    while (current) {
      if (current.type === 'group' && current.data.isHidden) {
        return true;
      }
      if (current.type === 'path' && directHiddenIds.has(current.id)) {
        return true;
      }
      current = current.parentId ? elementMap.get(current.parentId) : undefined;
    }
    return false;
  },
  isElementLocked: (elementId) => {
    const state = get() as CanvasStore;
    const directLockedIds = new Set(state.lockedElementIds ?? []);
    if (directLockedIds.has(elementId)) {
      return true;
    }
    const elementMap = helpers.getElementMap(state.elements);
    let current = elementMap.get(elementId);
    while (current) {
      if (current.type === 'group' && current.data.isLocked) {
        return true;
      }
      if (current.type === 'path' && directLockedIds.has(current.id)) {
        return true;
      }
      current = current.parentId ? elementMap.get(current.parentId) : undefined;
    }
    return false;
  },
});
