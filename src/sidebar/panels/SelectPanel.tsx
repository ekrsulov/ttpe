import React, { useCallback, useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { VStack, Box, useColorModeValue } from '@chakra-ui/react';
import { extractEditablePoints, extractSubpaths, commandsToString, translateCommands } from '../../utils/path';
import type { CanvasElement, PathData, GroupElement } from '../../types';
import { logger } from '../../utils';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { SelectPanelItem } from './SelectPanelItem';
import { SelectPanelGroupItem } from './SelectPanelGroupItem';
import { useDragResize } from '../../hooks/useDragResize';
import { getCommandsForPanelItem } from '../../utils/selectPanelHelpers';
import { buildElementMap } from '../../utils/coreHelpers';

const DEFAULT_PANEL_HEIGHT = 140;
const MIN_PANEL_HEIGHT = 96;
const MAX_PANEL_HEIGHT = 360;

// Helper to extract subpath data from an element (still needed for duplication translation)
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
  const isElementHidden = useCanvasStore(state => state.isElementHidden);
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

  const elementMap = useMemo(() => buildElementMap(elements), [elements]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const hiddenIdSet = useMemo(() => new Set(hiddenElementIds), [hiddenElementIds]);
  const lockedIdSet = useMemo(() => new Set(lockedElementIds), [lockedElementIds]);

  const selectedSubpathsByElement = useMemo(() => {
    const map = new Map<string, typeof selectedSubpaths>();
    (selectedSubpaths ?? []).forEach(subpath => {
      if (!map.has(subpath.elementId)) {
        map.set(subpath.elementId, []);
      }
      map.get(subpath.elementId)?.push(subpath);
    });
    return map;
  }, [selectedSubpaths]);

  const panelHeight = useCanvasStore((state) => state.selectPanelHeight);
  const setPanelHeight = useCanvasStore((state) => state.setSelectPanelHeight);
  
  const { 
    isDragging: isResizing, 
    handlePointerDown: handleResizeStart, 
    handleDoubleClick: handleResetHeight 
  } = useDragResize({
    onResize: setPanelHeight,
    onReset: () => setPanelHeight(DEFAULT_PANEL_HEIGHT),
    minValue: MIN_PANEL_HEIGHT,
    maxValue: MAX_PANEL_HEIGHT,
    direction: 'vertical',
    reverseVertical: true, // Drag up increases height
    initialValue: panelHeight,
  });

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
    // Use centralized command retrieval helper
    const commands = getCommandsForPanelItem(item);
    
    if (commands) {
      const pathData = commandsToString(commands);
      try {
        await navigator.clipboard.writeText(pathData);
        logger.info('Path copied to clipboard', pathData);
      } catch (err) {
        logger.error('Failed to copy path to clipboard', err);
      }
    }
  };

  const canGroup = selectedElements.length >= 2;
  const hasSelection = selectedElements.length > 0;

  const panelBg = useColorModeValue('surface.panel', 'surface.panel');
  const resizeColor = useColorModeValue('blue.500', 'blue.200');
  const messageColor = useColorModeValue('gray.600', 'gray.300');

  return (
    <Box bg={panelBg} px={2} position="relative">
      <RenderCountBadgeWrapper componentName="SelectPanel" position="top-right" />
      <Box
        height="6px"
        cursor="ns-resize"
        onPointerDown={handleResizeStart}
        onDoubleClick={handleResetHeight}
        bg={isResizing ? resizeColor : 'transparent'}
        borderRadius="full"
        mx="auto"
        my={1}
        w="40px"
        title="Arrastra para redimensionar, doble clic para resetear"
        _hover={{ bg: resizeColor }}
      />
      <Box h={`${panelHeight}px`} overflowY="auto">
        <VStack spacing={2} align="stretch">
          {orderedGroups.length > 0 && (
            <VStack spacing={1} align="stretch" pt={1}>
              {orderedGroups.map((group) => (
                <SelectPanelGroupItem
                  key={`group-${group.id}`}
                  group={group}
                  isSelected={selectedIdSet.has(group.id)}
                  hasSelectedDescendant={groupHasSelectedDescendant(group)}
                  elements={elements}
                />
              ))}
            </VStack>
          )}
          {items.length > 0 ? (
            <VStack spacing={1} align="stretch">
              {items.map((item) => {
                const elementId = item.element.id;
                const elementHidden = isElementHidden(elementId);
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
              color={messageColor}
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