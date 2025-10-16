import React, { useCallback, useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Copy, Clipboard, MousePointer2, Eye, EyeOff, Lock, Unlock, ChevronDown, ChevronRight } from 'lucide-react';
import { VStack, HStack, Box, Text, IconButton as ChakraIconButton, Tooltip, Editable, EditableInput, EditablePreview } from '@chakra-ui/react';
import { extractEditablePoints, extractSubpaths, commandsToString, translateCommands } from '../../utils/path';
import type { CanvasElement, PathData, Command, GroupElement } from '../../types';
import { logger } from '../../utils';
import { RenderCountBadgeWrapper } from '../ui/RenderCountBadgeWrapper';
import { PathThumbnail } from '../ui/PathThumbnail';
import { GroupControls } from '../ui/GroupControls';

// Helper to extract subpath data from an element
const getSubpathData = (element: CanvasElement, subpathIndex: number) => {
  if (element.type !== 'path') return null;
  
  const commands = (element.data as PathData).subPaths.flat();
  const subpaths = extractSubpaths(commands);
  return subpaths[subpathIndex] || null;
};

// Helper to calculate bounding box coordinates
const getBoundingBoxCoords = (commands: Command[]) => {
  if (commands.length === 0) return null;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  commands.forEach(cmd => {
    const points: number[] = [];
    
    switch (cmd.type) {
      case 'M':
      case 'L':
        points.push(cmd.position.x, cmd.position.y);
        break;
      case 'C':
        points.push(
          cmd.controlPoint1.x, cmd.controlPoint1.y,
          cmd.controlPoint2.x, cmd.controlPoint2.y,
          cmd.position.x, cmd.position.y
        );
        break;
      case 'Z':
        // Z command doesn't add new points
        break;
    }

    for (let i = 0; i < points.length; i += 2) {
      const x = points[i];
      const y = points[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  });

  return {
    topLeft: { x: Math.round(minX), y: Math.round(minY) },
    bottomRight: { x: Math.round(maxX), y: Math.round(maxY) }
  };
};

const SelectPanelComponent: React.FC = () => {
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const addElement = useCanvasStore(state => state.addElement);
  const createGroup = useCanvasStore(state => state.createGroupFromSelection);
  const ungroupSelectedGroups = useCanvasStore(state => state.ungroupSelectedGroups);
  const renameGroup = useCanvasStore(state => state.renameGroup);
  const setGroupExpanded = useCanvasStore(state => state.setGroupExpanded);
  const toggleGroupVisibility = useCanvasStore(state => state.toggleGroupVisibility);
  const toggleGroupLock = useCanvasStore(state => state.toggleGroupLock);
  const isElementHidden = useCanvasStore(state => state.isElementHidden);
  const isElementLocked = useCanvasStore(state => state.isElementLocked);
  const selectElements = useCanvasStore(state => state.selectElements);

  // Subscribe to elements and selectedIds separately to avoid infinite re-renders
  const elements = useCanvasStore(state => state.elements);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  
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
  const items: Array<{
    type: 'element' | 'subpath';
    element: CanvasElement;
    subpathIndex?: number;
    pointCount: number;
  }> = [];

  selectedElements.forEach(el => {
    if (el.type === 'path') {
      const commands = (el.data as PathData).subPaths.flat();
      const pointCount = extractEditablePoints(commands).length;
      items.push({ type: 'element', element: el, pointCount });

      // Add selected subpaths for this element
      const elementSubpaths = selectedSubpaths.filter(sp => sp.elementId === el.id);
      const subpaths = extractSubpaths(commands);
      elementSubpaths.forEach(sp => {
        const subpathData = subpaths[sp.subpathIndex];
        if (subpathData) {
          const subPointCount = extractEditablePoints(subpathData.commands).length;
          items.push({ type: 'subpath', element: el, subpathIndex: sp.subpathIndex, pointCount: subPointCount });
        }
      });
    }
  });

  const duplicateItem = (item: typeof items[0]) => {
    if (item.type === 'element') {
      // Duplicate the entire element
      const { id: _id, zIndex: _zIndex, ...elementData } = item.element;
      
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

  const copyPathToClipboard = async (item: typeof items[0]) => {
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

    const borderColor = isSelected
      ? 'blue.400'
      : hasSelectedDescendant
        ? 'blue.200'
        : 'gray.200';

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
        borderWidth="1px"
        borderColor={borderColor}
        boxShadow={isSelected ? '0 0 0 1px rgba(59, 130, 246, 0.4)' : undefined}
        transition="background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease"
      >
        <HStack spacing={2} align="center">
          <ChakraIconButton
            aria-label={groupData.isExpanded ? 'Contraer grupo' : 'Expandir grupo'}
            icon={groupData.isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            size="xs"
            variant="ghost"
            minW="auto"
            h="20px"
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
            {groupData.childIds.length} elementos
          </Text>
          <HStack spacing={1} ml="auto">
            <Tooltip label={groupLocked ? 'Desbloquear grupo' : 'Bloquear grupo'} openDelay={200}>
              <ChakraIconButton
                aria-label={groupLocked ? 'Desbloquear grupo' : 'Bloquear grupo'}
                icon={groupLocked ? <Unlock size={12} /> : <Lock size={12} />}
                size="xs"
                variant="ghost"
                minW="auto"
                h="20px"
                onClick={() => toggleGroupLock(group.id)}
              />
            </Tooltip>
            <Tooltip label={groupHidden ? 'Mostrar grupo' : 'Ocultar grupo'} openDelay={200}>
              <ChakraIconButton
                aria-label={groupHidden ? 'Mostrar grupo' : 'Ocultar grupo'}
                icon={groupHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                size="xs"
                variant="ghost"
                minW="auto"
                h="20px"
                onClick={() => toggleGroupVisibility(group.id)}
              />
            </Tooltip>
            <Tooltip label="Seleccionar grupo" openDelay={200}>
              <ChakraIconButton
                aria-label="Seleccionar grupo"
                icon={<MousePointer2 size={12} />}
                size="xs"
                variant="ghost"
                minW="auto"
                h="20px"
                onClick={() => selectElements([group.id])}
              />
            </Tooltip>
          </HStack>
        </HStack>
        {groupData.isExpanded && (
          <VStack align="stretch" spacing={1} pl={6} pt={2} fontSize="9px">
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
                  <Tooltip label="Seleccionar elemento" openDelay={200}>
                    <ChakraIconButton
                      aria-label="Seleccionar elemento"
                      icon={<MousePointer2 size={11} />}
                      size="xs"
                      variant="ghost"
                      minW="auto"
                      h="18px"
                      onClick={() => selectElements([childId])}
                      isDisabled={childLocked || childHidden}
                    />
                  </Tooltip>
                </HStack>
              );
            })}
          </VStack>
        )}
      </Box>
    );
  };

  const canGroup = selectedElements.length >= 2;
  const canUngroup = selectedElements.some(el => el.type === 'group');
  const hasSelection = selectedElements.length > 0;

  return (
    <Box bg="white" px={2} position="relative">
      <RenderCountBadgeWrapper componentName="SelectPanel" position="top-right" />
      <Box h="94px" overflowY="auto">
        <VStack spacing={2} align="stretch">
          <Box px={1} pt={1}>
            <GroupControls
              canGroup={canGroup}
              canUngroup={canUngroup}
              onGroup={() => createGroup()}
              onUngroup={() => ungroupSelectedGroups()}
            />
          </Box>
          {groups.length > 0 && (
            <VStack spacing={1} align="stretch" pt={1}>
              {groups.map((group) => (
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
                // Get commands for thumbnail and bbox
                let thumbnailCommands: Command[] = [];
                if (item.type === 'element' && item.element.type === 'path') {
                  thumbnailCommands = (item.element.data as PathData).subPaths.flat();
                } else if (item.type === 'subpath' && item.subpathIndex !== undefined) {
                  const subpathData = getSubpathData(item.element, item.subpathIndex);
                  if (subpathData) {
                    thumbnailCommands = subpathData.commands;
                  }
                }

                // Calculate bbox coordinates
                const bbox = getBoundingBoxCoords(thumbnailCommands);

                return (
                  <HStack
                    key={`${item.element.id}-${item.type}-${item.subpathIndex || 0}`}
                    spacing={2}
                    px={1}
                    py={1}
                    bg="gray.50"
                    borderRadius="sm"
                    fontSize="10px"
                    align="flex-start"
                  >
                    {/* Thumbnail */}
                    {thumbnailCommands.length > 0 && (
                      <PathThumbnail
                        commands={thumbnailCommands}
                        size={32}
                        element={item.element}
                      />
                    )}

                    {/* Text info */}
                    <Box flex={1}>
                      <Text fontWeight="500" fontSize="10px">
                        {item.type === 'element'
                          ? `${item.element.type} (z: ${item.element.zIndex}) - ${item.pointCount} points`
                          : `Subpath ${item.subpathIndex} - ${item.pointCount} points`
                        }
                      </Text>
                      {bbox && (
                        <Text fontSize="9px" color="gray.600">
                          ({bbox.topLeft.x}, {bbox.topLeft.y}) → ({bbox.bottomRight.x}, {bbox.bottomRight.y})
                        </Text>
                      )}
                    </Box>

                    {/* Action buttons - always aligned to the right */}
                    <HStack spacing={1}>
                      <ChakraIconButton
                        aria-label="Duplicate"
                        icon={<Copy size={10} />}
                        onClick={() => duplicateItem(item)}
                        size="xs"
                        minW="auto"
                        h="auto"
                        p={1}
                      />
                      <ChakraIconButton
                        aria-label="Copy Path to Clipboard"
                        icon={<Clipboard size={10} />}
                        onClick={() => copyPathToClipboard(item)}
                        size="xs"
                        minW="auto"
                        h="auto"
                        p={1}
                      />
                    </HStack>
                  </HStack>
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