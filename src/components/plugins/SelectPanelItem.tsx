import React, { memo } from 'react';
import { VStack, HStack, Text } from '@chakra-ui/react';
import { Copy, Clipboard, MousePointer2, Eye, EyeOff, Lock, Unlock, Group as GroupIcon } from 'lucide-react';
import { extractSubpaths } from '../../utils/path';
import type { CanvasElement, PathData, Command, PathElement } from '../../types';
import { PathThumbnail } from '../ui/PathThumbnail';
import { PanelActionButton } from '../ui/PanelActionButton';
import { useCanvasStore } from '../../store/canvasStore';

type SelectPanelItemType =
  | {
      type: 'element';
      element: CanvasElement;
      pointCount: number;
    }
  | {
      type: 'subpath';
      element: PathElement;
      subpathIndex: number;
      pointCount: number;
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

interface SelectPanelItemProps {
  item: SelectPanelItemType;
  isSelected: boolean;
  isHidden: boolean;
  isLocked: boolean;
  directHidden: boolean;
  directLocked: boolean;
  canGroup: boolean;
  onDuplicate: (item: SelectPanelItemType) => void;
  onCopyPath: (item: SelectPanelItemType) => void;
}

const SelectPanelItemComponent: React.FC<SelectPanelItemProps> = ({
  item,
  isSelected,
  isHidden,
  isLocked,
  directHidden,
  directLocked,
  canGroup,
  onDuplicate,
  onCopyPath,
}) => {
  // Only subscribe to the specific actions we need
  const createGroup = useCanvasStore(state => state.createGroupFromSelection);
  const toggleElementVisibility = useCanvasStore(state => state.toggleElementVisibility);
  const toggleElementLock = useCanvasStore(state => state.toggleElementLock);
  const selectElements = useCanvasStore(state => state.selectElements);

  // Get commands for thumbnail and bbox
  let thumbnailCommands: Command[] = [];
  if (item.type === 'element' && item.element.type === 'path') {
    thumbnailCommands = (item.element.data as PathData).subPaths.flat();
  } else if (item.type === 'subpath' && item.subpathIndex !== undefined) {
    const subpathData = extractSubpaths((item.element.data as PathData).subPaths.flat())[item.subpathIndex];
    if (subpathData) {
      thumbnailCommands = subpathData.commands;
    }
  }

  // Calculate bbox coordinates
  const bbox = getBoundingBoxCoords(thumbnailCommands);

  const elementId = item.element.id;
  const subpathIndex = item.type === 'subpath' ? item.subpathIndex : undefined;
  const primaryLabel = item.type === 'element'
    ? `z: ${item.element.zIndex} - p: ${item.pointCount}`
    : `Subpath ${subpathIndex ?? 0} - p: ${item.pointCount}`;
  const canCopyPath = item.type === 'element' && item.element.type === 'path';
  const containerBg = isSelected ? 'blue.50' : 'gray.50';

  const itemKey = subpathIndex !== undefined
    ? `${item.element.id}-${item.type}-${subpathIndex}`
    : `${item.element.id}-${item.type}`;

  // Separar las coordenadas para mostrar en líneas diferentes
  const coord1 = bbox ? `${bbox.topLeft.x}, ${bbox.topLeft.y}` : null;
  const coord2 = bbox ? `${bbox.bottomRight.x}, ${bbox.bottomRight.y}` : null;

  return (
    <HStack
      key={itemKey}
      spacing={2}
      px={1}
      py={1}
      bg={containerBg}
      borderRadius="sm"
      fontSize="10px"
      align="center"
    >
      {thumbnailCommands.length > 0 && (
        <PathThumbnail
          commands={thumbnailCommands}
        />
      )}
      <VStack spacing={0} align="stretch" flex={1} justifyContent="center">
        {/* Línea 1: Info principal */}
        <Text
          fontWeight="500"
          fontSize="10px"
          color={isHidden ? 'gray.400' : isSelected ? 'blue.700' : 'gray.800'}
          lineHeight="1.4"
        >
          {primaryLabel}
        </Text>
        {/* Línea 2: Primera coordenada */}
        <Text
          fontSize="9px"
          color={isHidden ? 'gray.400' : 'gray.600'}
          lineHeight="1.4"
        >
          {coord1 ?? '—'}
        </Text>
        {/* Línea 3: Segunda coordenada */}
        <Text
          fontSize="9px"
          color={isHidden ? 'gray.400' : 'gray.600'}
          lineHeight="1.4"
        >
          {coord2 ?? '—'}
        </Text>
      </VStack>
      <VStack spacing={1} align="flex-end">
        {/* Fila 1: Group (si aplica), Duplicate, Clipboard */}
        <HStack spacing={1}>
          {item.type === 'element' && isSelected && (
            <PanelActionButton
              label="Group selected elements"
              icon={GroupIcon}
              iconSize={10}
              height="auto"
              onClick={() => createGroup()}
              isDisabled={!canGroup}
            />
          )}
          <PanelActionButton
            label="Duplicate"
            icon={Copy}
            iconSize={10}
            height="auto"
            onClick={() => onDuplicate(item)}
          />
          <PanelActionButton
            label="Copy path to clipboard"
            icon={Clipboard}
            iconSize={10}
            height="auto"
            onClick={() => onCopyPath(item)}
            isDisabled={!canCopyPath}
          />
        </HStack>
        {/* Fila 2: Lock, View, Select */}
        <HStack spacing={1}>
          <PanelActionButton
            label={directLocked ? 'Unlock element' : 'Lock element'}
            icon={directLocked ? Unlock : Lock}
            iconSize={10}
            height="auto"
            onClick={() => toggleElementLock(elementId)}
          />
          <PanelActionButton
            label={directHidden ? 'Show element' : 'Hide element'}
            icon={directHidden ? Eye : EyeOff}
            iconSize={10}
            height="auto"
            onClick={() => toggleElementVisibility(elementId)}
          />
          <PanelActionButton
            label="Select element"
            icon={MousePointer2}
            iconSize={10}
            height="auto"
            onClick={() => selectElements([elementId])}
            isDisabled={isLocked || isHidden}
          />
        </HStack>
      </VStack>
    </HStack>
  );
};

// Custom comparison function - only re-render if these specific props change
const arePropsEqual = (prevProps: SelectPanelItemProps, nextProps: SelectPanelItemProps): boolean => {
  // Check if basic flags changed
  if (
    prevProps.isSelected !== nextProps.isSelected ||
    prevProps.isHidden !== nextProps.isHidden ||
    prevProps.isLocked !== nextProps.isLocked ||
    prevProps.directHidden !== nextProps.directHidden ||
    prevProps.directLocked !== nextProps.directLocked ||
    prevProps.canGroup !== nextProps.canGroup
  ) {
    return false;
  }

  // Check if item type changed
  if (prevProps.item.type !== nextProps.item.type) {
    return false;
  }

  // For element items, check if relevant properties changed
  if (prevProps.item.type === 'element' && nextProps.item.type === 'element') {
    const prevEl = prevProps.item.element;
    const nextEl = nextProps.item.element;
    
    // Only re-render if element ID, zIndex, or point count changed
    // We don't care about data changes for display purposes
    if (
      prevEl.id !== nextEl.id ||
      prevEl.zIndex !== nextEl.zIndex ||
      prevProps.item.pointCount !== nextProps.item.pointCount
    ) {
      return false;
    }
    
    // Check if the bounding box changed significantly (for path elements)
    if (prevEl.type === 'path' && nextEl.type === 'path') {
      const prevCommands = (prevEl.data as PathData).subPaths.flat();
      const nextCommands = (nextEl.data as PathData).subPaths.flat();
      const prevBbox = getBoundingBoxCoords(prevCommands);
      const nextBbox = getBoundingBoxCoords(nextCommands);
      
      // Compare bounding boxes
      if (prevBbox && nextBbox) {
        if (
          prevBbox.topLeft.x !== nextBbox.topLeft.x ||
          prevBbox.topLeft.y !== nextBbox.topLeft.y ||
          prevBbox.bottomRight.x !== nextBbox.bottomRight.x ||
          prevBbox.bottomRight.y !== nextBbox.bottomRight.y
        ) {
          return false;
        }
      } else if (prevBbox !== nextBbox) {
        return false;
      }
    }
  }

  // For subpath items, check if subpath index or point count changed
  if (prevProps.item.type === 'subpath' && nextProps.item.type === 'subpath') {
    if (
      prevProps.item.element.id !== nextProps.item.element.id ||
      prevProps.item.subpathIndex !== nextProps.item.subpathIndex ||
      prevProps.item.pointCount !== nextProps.item.pointCount
    ) {
      return false;
    }
    
    // Check if the bounding box of the specific subpath changed
    const prevEl = prevProps.item.element;
    const nextEl = nextProps.item.element;
    
    if (prevEl.type === 'path' && nextEl.type === 'path') {
      const prevSubpaths = extractSubpaths((prevEl.data as PathData).subPaths.flat());
      const nextSubpaths = extractSubpaths((nextEl.data as PathData).subPaths.flat());
      
      const prevSubpath = prevSubpaths[prevProps.item.subpathIndex];
      const nextSubpath = nextSubpaths[nextProps.item.subpathIndex];
      
      if (prevSubpath && nextSubpath) {
        const prevBbox = getBoundingBoxCoords(prevSubpath.commands);
        const nextBbox = getBoundingBoxCoords(nextSubpath.commands);
        
        // Compare bounding boxes
        if (prevBbox && nextBbox) {
          if (
            prevBbox.topLeft.x !== nextBbox.topLeft.x ||
            prevBbox.topLeft.y !== nextBbox.topLeft.y ||
            prevBbox.bottomRight.x !== nextBbox.bottomRight.x ||
            prevBbox.bottomRight.y !== nextBbox.bottomRight.y
          ) {
            return false;
          }
        } else if (prevBbox !== nextBbox) {
          return false;
        }
      }
    }
  }

  // Props are equal
  return true;
};

export const SelectPanelItem = memo(SelectPanelItemComponent, arePropsEqual);
