import React, { memo } from 'react';
import { VStack, HStack, Text } from '@chakra-ui/react';
import { Copy, Clipboard, MousePointer2, Eye, EyeOff, Lock, Unlock, Group as GroupIcon } from 'lucide-react';
import { extractSubpaths } from '../../utils/path';
import type { PathData } from '../../types';
import { PathThumbnail } from '../ui/PathThumbnail';
import { PanelActionButton } from '../ui/PanelActionButton';
import { useCanvasStore } from '../../store/canvasStore';
import { haveBoundsChanged, areBboxesEqual } from '../../utils/comparators/bounds';
import { getItemThumbnailData } from '../../utils/selectPanelHelpers';

// Import shared type instead of duplicating
import type { SelectPanelItemData } from './SelectPanel.types';

interface SelectPanelItemProps {
  item: SelectPanelItemData;
  isSelected: boolean;
  isHidden: boolean;
  isLocked: boolean;
  directHidden: boolean;
  directLocked: boolean;
  canGroup: boolean;
  onDuplicate: (item: SelectPanelItemData) => void;
  onCopyPath: (item: SelectPanelItemData) => void;
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

  // Use centralized helper to get thumbnail data and bounds
  const { commands: thumbnailCommands, bbox } = item.element.type === 'path'
    ? getItemThumbnailData(
        item.type,
        item.element.data as PathData,
        item.type === 'subpath' ? item.subpathIndex : undefined
      )
    : { commands: [], bbox: null };

  const elementId = item.element.id;
  const subpathIndex = item.type === 'subpath' ? item.subpathIndex : undefined;
  const primaryLabel = item.type === 'element'
    ? `path (${item.pointCount}) z: ${item.element.zIndex}`
    : `subpath-${subpathIndex ?? 0} (${item.pointCount})`;
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
              height="auto"
              onClick={() => createGroup()}
              isDisabled={!canGroup}
            />
          )}
          <PanelActionButton
            label="Duplicate"
            icon={Copy}
            height="auto"
            onClick={() => onDuplicate(item)}
          />
          {item.type === 'element' && (
            <PanelActionButton
              label="Copy path to clipboard"
              icon={Clipboard}
              height="auto"
              onClick={() => onCopyPath(item)}
              isDisabled={!canCopyPath}
            />
          )}
        </HStack>
        {/* Fila 2: Lock, View, Select */}
        {item.type === 'element' && (
          <HStack spacing={1}>
            <PanelActionButton
              label={directLocked ? 'Unlock element' : 'Lock element'}
              icon={directLocked ? Unlock : Lock}
              height="auto"
              onClick={() => toggleElementLock(elementId)}
            />
            <PanelActionButton
              label={directHidden ? 'Show element' : 'Hide element'}
              icon={directHidden ? Eye : EyeOff}
              height="auto"
              onClick={() => toggleElementVisibility(elementId)}
            />
            <PanelActionButton
              label="Select element"
              icon={MousePointer2}
              height="auto"
              onClick={() => selectElements([elementId])}
              isDisabled={isLocked || isHidden}
            />
          </HStack>
        )}
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
    
    if (prevEl.type === 'path' && nextEl.type === 'path') {
      const prevStrokeWidth = (prevEl.data as PathData).strokeWidth ?? 1;
      const nextStrokeWidth = (nextEl.data as PathData).strokeWidth ?? 1;
      const prevCommands = (prevEl.data as PathData).subPaths.flat();
      const nextCommands = (nextEl.data as PathData).subPaths.flat();
      
      // Use shared bounds comparison utility - checks both strokeWidth and bounds
      if (haveBoundsChanged(prevCommands, nextCommands, prevStrokeWidth, nextStrokeWidth, 1)) {
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
    
    // Check if strokeWidth or bounding box of the specific subpath changed
    const prevEl = prevProps.item.element;
    const nextEl = nextProps.item.element;
    
    if (prevEl.type === 'path' && nextEl.type === 'path') {
      const prevStrokeWidth = (prevEl.data as PathData).strokeWidth ?? 1;
      const nextStrokeWidth = (nextEl.data as PathData).strokeWidth ?? 1;
      
      // If strokeWidth changed, re-render (affects displayed coordinates)
      if (prevStrokeWidth !== nextStrokeWidth) {
        return false;
      }
      
      const prevSubpaths = extractSubpaths((prevEl.data as PathData).subPaths.flat());
      const nextSubpaths = extractSubpaths((nextEl.data as PathData).subPaths.flat());
      
      const prevSubpath = prevSubpaths[prevProps.item.subpathIndex];
      const nextSubpath = nextSubpaths[nextProps.item.subpathIndex];
      
      if (prevSubpath && nextSubpath) {
        // Use centralized helper to compare bounds
        const prevData = getItemThumbnailData('subpath', prevEl.data as PathData, prevProps.item.subpathIndex);
        const nextData = getItemThumbnailData('subpath', nextEl.data as PathData, nextProps.item.subpathIndex);
        
        // Compare bounding boxes using shared utility
        if (!areBboxesEqual(prevData.bbox, nextData.bbox)) {
          return false;
        }
      }
    }
  }

  // Props are equal
  return true;
};

export const SelectPanelItem = memo(SelectPanelItemComponent, arePropsEqual);
