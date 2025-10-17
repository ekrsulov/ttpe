import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { MousePointer2, Eye, EyeOff, Lock, Unlock, ChevronDown, ChevronRight, Ungroup as UngroupIcon } from 'lucide-react';
import { VStack, HStack, Box, Text, Editable, EditableInput, EditablePreview } from '@chakra-ui/react';
import { extractEditablePoints, extractSubpaths, commandsToString, translateCommands } from '../../utils/path';
import type { CanvasElement, PathData, Command, GroupElement } from '../../types';
import { logger } from '../../utils';
import { RenderCountBadgeWrapper } from '../ui/RenderCountBadgeWrapper';
import { PathThumbnail } from '../ui/PathThumbnail';
import { PanelActionButton } from '../ui/PanelActionButton';
import { SelectPanelItem } from './SelectPanelItem';
import { usePersistentState } from '../../hooks/usePersistentState';

const DEFAULT_PANEL_HEIGHT = 140;
const MIN_PANEL_HEIGHT = 96;
const MAX_PANEL_HEIGHT = 360;

// Helper to extract subpath data from an element
const getSubpathData = (element: CanvasElement, subpathIndex: number) => {
  if (element.type !== 'path') return null;
  
  const commands = (element.data as PathData).subPaths.flat();
  const subpaths = extractSubpaths(commands);
  return subpaths[subpathIndex] || null;
};

// Import shared type instead of duplicating
import type { SelectPanelItemData } from './SelectPanel.types';

const omitIdAndZIndex = <T extends { id: string; zIndex: number }>(element: T): Omit<T, 'id' | 'zIndex'> => {
  const { id: _id, zIndex: _zIndex, ...rest } = element;
  return rest;
};

const SelectPanelComponent: React.FC = () => {
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const addElement = useCanvasStore(state => state.addElement);
  const ungroupGroupById = useCanvasStore(state => state.ungroupGroupById);
  const renameGroup = useCanvasStore(state => state.renameGroup);
  const setGroupExpanded = useCanvasStore(state => state.setGroupExpanded);
  const toggleGroupVisibility = useCanvasStore(state => state.toggleGroupVisibility);
  const toggleGroupLock = useCanvasStore(state => state.toggleGroupLock);
  const isElementHidden = useCanvasStore(state => state.isElementHidden);
  const isElementLocked = useCanvasStore(state => state.isElementLocked);
  const selectElements = useCanvasStore(state => state.selectElements);
  const hiddenElementIds = useCanvasStore(state => state.hiddenElementIds);
  const lockedElementIds = useCanvasStore(state => state.lockedElementIds);

  // Optimize subscriptions - only re-subscribe when elements structure changes (not data)
  // This prevents re-renders when elements are transformed/moved
  const selectedIds = useCanvasStore(state => state.selectedIds);
  
  // Get elements from store
  const elements = useCanvasStore(state => state.elements);
  
  // Memoize the filtered selected elements to prevent unnecessary re-renders
  const selectedElements = useMemo(() =>
    elements.filter(el => selectedIds.includes(el.id)),
    [elements, selectedIds]
  );

  const groups = useMemo(
    () =>
      elements
        .filter((el): el is GroupElement => el.type === 'group')
        .sort((a, b) => a.data.name.localeCompare(b.data.name)),
    [elements]
  );

  const elementMap = useMemo(() => {
    const map = new Map<string, CanvasElement>();
    elements.forEach((el) => {
      map.set(el.id, el);
    });
    return map;
  }, [elements]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const hiddenIdSet = useMemo(() => new Set(hiddenElementIds), [hiddenElementIds]);
  const lockedIdSet = useMemo(() => new Set(lockedElementIds), [lockedElementIds]);

  const selectedSubpathsByElement = useMemo(() => {
    const map = new Map<string, typeof selectedSubpaths>();
    selectedSubpaths.forEach(subpath => {
      if (!map.has(subpath.elementId)) {
        map.set(subpath.elementId, []);
      }
      map.get(subpath.elementId)?.push(subpath);
    });
    return map;
  }, [selectedSubpaths]);

  const [panelHeight, setPanelHeight] = usePersistentState('select-panel-height', DEFAULT_PANEL_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(DEFAULT_PANEL_HEIGHT);

  const handleResizeStart = useCallback((event: React.PointerEvent) => {
    event.preventDefault();
    resizeStartYRef.current = event.clientY;
    resizeStartHeightRef.current = panelHeight;
    setIsResizing(true);
  }, [panelHeight]);

  const handleResetHeight = useCallback(() => {
    setPanelHeight(DEFAULT_PANEL_HEIGHT);
  }, [setPanelHeight]);

  useEffect(() => {
    if (!isResizing) {
      return () => {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }

    const handleMouseMove = (event: PointerEvent) => {
      const deltaY = resizeStartYRef.current - event.clientY;
      const newHeight = Math.min(
        Math.max(resizeStartHeightRef.current + deltaY, MIN_PANEL_HEIGHT),
        MAX_PANEL_HEIGHT,
      );
      setPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('pointermove', handleMouseMove);
    document.addEventListener('pointerup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';

    return () => {
      document.removeEventListener('pointermove', handleMouseMove);
      document.removeEventListener('pointerup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, setPanelHeight]);

  // Note: Footer height CSS variable is managed by SidebarFooter component using useSidebarFooterHeight hook
  // No need for manual fallback - ResizeObserver is widely supported

  const orderedGroups = useMemo(() => {
    return groups;
  }, [groups]);

  const groupHasSelectedDescendant = useCallback(
    (group: GroupElement) => {
      const queue = [...group.data.childIds];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const childId = queue.shift();
        if (!childId || visited.has(childId)) {
          continue;
        }

        visited.add(childId);

        if (selectedIdSet.has(childId)) {
          return true;
        }

        const child = elementMap.get(childId);
        if (child && child.type === 'group') {
          queue.push(...child.data.childIds);
        }
      }

      return false;
    },
    [elementMap, selectedIdSet]
  );

  // Build list of items to display
  const items = useMemo<SelectPanelItemData[]>(() => {
    const allItems: SelectPanelItemData[] = [];

    elements.forEach((element) => {
      if (element.type === 'group') {
        return;
      }

      if (element.type !== 'path') {
        const nonPathElement = element as CanvasElement;
        const baseItem: SelectPanelItemData = { type: 'element', element: nonPathElement, pointCount: 0 };
        allItems.push(baseItem);
        return;
      }

      const commands = (element.data as PathData).subPaths.flat();
      const pointCount = extractEditablePoints(commands).length;
      const baseItem: SelectPanelItemData = { type: 'element', element, pointCount };

      allItems.push(baseItem);

      // Add subpaths if this element is selected
      if (selectedIdSet.has(element.id)) {
        const subpaths = extractSubpaths(commands);
        const subpathSelections = selectedSubpathsByElement.get(element.id) ?? [];
        subpathSelections.forEach((selection) => {
          const subpathData = subpaths[selection.subpathIndex];
          if (!subpathData) {
            return;
          }
          const subPointCount = extractEditablePoints(subpathData.commands).length;
          allItems.push({
            type: 'subpath',
            element,
            subpathIndex: selection.subpathIndex,
            pointCount: subPointCount,
          });
        });
      }
    });

    return allItems;
  }, [elements, selectedIdSet, selectedSubpathsByElement]);

  const duplicateItem = (item: SelectPanelItemData) => {
    if (item.type === 'element') {
      // Duplicate the entire element
      const elementData = omitIdAndZIndex(item.element);
      
      // If it's a path, translate it to make duplication visible
      if (elementData.type === 'path') {
        const pathData = elementData.data as PathData;
        const translatedSubPaths = pathData.subPaths.map(subPath => 
          translateCommands(subPath, 20, 20)
        );
        
        addElement({
          ...elementData,
          data: {
            ...pathData,
            subPaths: translatedSubPaths
          }
        });
      } else {
        addElement(elementData);
      }
    } else if (item.type === 'subpath' && item.subpathIndex !== undefined) {
      // Duplicate the subpath as a new element
      const subpathData = getSubpathData(item.element, item.subpathIndex);
      if (subpathData) {
        // Translate the subpath commands to make duplication visible
        const translatedCommands = translateCommands(subpathData.commands, 20, 20);
        
        // Create new path element from subpath
        addElement({
          type: 'path',
          data: {
            ...item.element.data,
            subPaths: [translatedCommands],
          },
        });
      }
    }
  };

  const copyPathToClipboard = async (item: SelectPanelItemData) => {
    let pathData = '';

    if (item.type === 'element') {
      // Copy the entire element's path
      if (item.element.type === 'path') {
        pathData = commandsToString((item.element.data as PathData).subPaths.flat());
      }
    } else if (item.type === 'subpath' && item.subpathIndex !== undefined) {
      // Copy the subpath's path
      const subpathData = getSubpathData(item.element, item.subpathIndex);
      if (subpathData) {
        pathData = commandsToString(subpathData.commands);
      }
    }

    if (pathData) {
      try {
        await navigator.clipboard.writeText(pathData);
        logger.info('Path copied to clipboard', pathData);
      } catch (err) {
        logger.error('Failed to copy path to clipboard', err);
      }
    }
  };

  const renderGroupItem = (group: GroupElement, options?: { isSelected?: boolean; hasSelectedDescendant?: boolean }) => {
    const groupData = group.data;
    const groupHidden = isElementHidden(group.id);
    const groupLocked = isElementLocked(group.id);
    const isSelected = options?.isSelected ?? false;
    const hasSelectedDescendant = options?.hasSelectedDescendant ?? false;

    // Create thumbnail commands from all paths in the group
    const groupThumbnailCommands: Command[] = [];
    groupData.childIds.forEach(childId => {
      const child = elements.find(el => el.id === childId);
      if (child && child.type === 'path') {
        const pathData = child.data as PathData;
        groupThumbnailCommands.push(...pathData.subPaths.flat());
      }
    });

    const backgroundColor = isSelected
      ? 'blue.50'
      : hasSelectedDescendant
        ? 'rgba(59, 130, 246, 0.08)'
        : 'gray.50';

    return (
      <Box
        key={`group-${group.id}`}
        px={1}
        py={1}
        bg={backgroundColor}
        borderRadius="sm"
        transition="background-color 0.2s ease"
      >
        <HStack spacing={2} align="center">
          <PanelActionButton
            label={groupData.isExpanded ? 'Collapse group' : 'Expand group'}
            icon={groupData.isExpanded ? ChevronDown : ChevronRight}
            onClick={() => setGroupExpanded(group.id, !groupData.isExpanded)}
          />
          <Editable
            defaultValue={groupData.name}
            fontSize="11px"
            fontWeight="600"
            onSubmit={(value) => renameGroup(group.id, value)}
            isPreviewFocusable
            selectAllOnFocus
          >
            <EditablePreview color={groupHidden ? 'gray.400' : 'gray.800'} />
            <EditableInput />
          </Editable>
          <Text fontSize="10px" color="gray.600">
            ({groupData.childIds.length})
          </Text>
          <HStack spacing={1} ml="auto">
            <PanelActionButton
              label="Ungroup"
              icon={UngroupIcon}
              onClick={() => ungroupGroupById(group.id)}
              isDisabled={groupLocked}
            />
            <PanelActionButton
              label={groupLocked ? 'Unlock group' : 'Lock group'}
              icon={groupLocked ? Unlock : Lock}
              onClick={() => toggleGroupLock(group.id)}
            />
            <PanelActionButton
              label={groupHidden ? 'Show group' : 'Hide group'}
              icon={groupHidden ? Eye : EyeOff}
              onClick={() => toggleGroupVisibility(group.id)}
            />
            <PanelActionButton
              label="Select group"
              icon={MousePointer2}
              onClick={() => selectElements([group.id])}
            />
          </HStack>
        </HStack>
        {groupData.isExpanded && (
          <HStack spacing={2} align="flex-start" >
            {groupThumbnailCommands.length > 0 && (
              <PathThumbnail
                commands={groupThumbnailCommands}
              />
            )}
            <VStack align="stretch" spacing={1} flex={1} fontSize="9px">
              {groupData.childIds.map((childId) => {
                const child = elements.find(el => el.id === childId);
                if (!child) {
                  return null;
                }

                const childHidden = isElementHidden(child.id);
                const childLocked = isElementLocked(child.id);
                const childLabel = child.type === 'group'
                  ? child.data.name
                  : `${child.type} (${child.id.slice(-4)})`;
                const childIsSelected = selectedIdSet.has(child.id);

                return (
                  <HStack
                    key={childId}
                    spacing={2}
                    justify="space-between"
                    color={childHidden ? 'gray.400' : childIsSelected ? 'blue.600' : 'gray.700'}
                    fontWeight={childIsSelected ? '600' : 'normal'}
                  >
                    <HStack spacing={1} align="center">
                      <Text>{childLabel}</Text>
                      {childLocked && <Lock size={10} color="#6b7280" />}
                      {childHidden && <EyeOff size={10} color="#6b7280" />}
                    </HStack>
                    <PanelActionButton
                      label="Select element"
                      icon={MousePointer2}
                      iconSize={11}
                      height="18px"
                      onClick={() => selectElements([childId])}
                      isDisabled={childLocked || childHidden}
                    />
                  </HStack>
                );
              })}
            </VStack>
          </HStack>
        )}
      </Box>
    );
  };

  const canGroup = selectedElements.length >= 2;
  const hasSelection = selectedElements.length > 0;

  return (
    <Box bg="white" px={2} position="relative">
      <RenderCountBadgeWrapper componentName="SelectPanel" position="top-right" />
      <Box
        height="6px"
        cursor="ns-resize"
        onPointerDown={handleResizeStart}
        onDoubleClick={handleResetHeight}
        bg={isResizing ? 'blue.400' : 'gray.200'}
        borderRadius="full"
        mx="auto"
        my={1}
        w="40px"
        title="Arrastra para redimensionar, doble clic para resetear"
        _hover={{ bg: isResizing ? 'blue.400' : 'blue.200' }}
      />
      <Box h={`${panelHeight}px`} overflowY="auto">
        <VStack spacing={2} align="stretch">
          {orderedGroups.length > 0 && (
            <VStack spacing={1} align="stretch" pt={1}>
              {orderedGroups.map((group) => (
                renderGroupItem(group, {
                  isSelected: selectedIdSet.has(group.id),
                  hasSelectedDescendant: groupHasSelectedDescendant(group)
                })
              ))}
            </VStack>
          )}
          {items.length > 0 ? (
            <VStack spacing={1} align="stretch">
              {items.map((item) => {
                const elementId = item.element.id;
                const elementHidden = isElementHidden(elementId);
                const elementLocked = isElementLocked(elementId);
                const isSelectedElement = selectedIdSet.has(elementId);
                const directHidden = hiddenIdSet.has(elementId);
                const directLocked = lockedIdSet.has(elementId);
                
                const itemKey = item.type === 'subpath' && item.subpathIndex !== undefined
                  ? `${item.element.id}-${item.type}-${item.subpathIndex}`
                  : `${item.element.id}-${item.type}`;

                return (
                  <SelectPanelItem
                    key={itemKey}
                    item={item}
                    isSelected={isSelectedElement}
                    isHidden={elementHidden}
                    isLocked={elementLocked}
                    directHidden={directHidden}
                    directLocked={directLocked}
                    canGroup={canGroup}
                    onDuplicate={duplicateItem}
                    onCopyPath={copyPathToClipboard}
                  />
                );
              })}
            </VStack>
          ) : (
            <Box
              fontSize="11px"
              color="gray.600"
              textAlign="center"
              p={2}
              h="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {hasSelection
                ? 'No additional options available for the selected items'
                : 'Select elements to see details and options'}
            </Box>
          )}
        </VStack>
      </Box>
    </Box>
  );
};

// Export memoized version to prevent unnecessary re-renders
export const SelectPanel = React.memo(SelectPanelComponent);