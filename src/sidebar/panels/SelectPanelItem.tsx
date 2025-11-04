import React, { memo } from 'react';
import { VStack, HStack, Text, Icon, useColorModeValue } from '@chakra-ui/react';
import { Copy, Clipboard, Group as GroupIcon, RulerDimensionLine, MoveUpLeft, MoveDownRight } from 'lucide-react';
import { extractSubpaths } from '../../utils/path';
import type { PathData } from '../../types';
import { PathThumbnail } from '../../ui/PathThumbnail';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { useCanvasStore } from '../../store/canvasStore';
import { haveBoundsChanged, areBboxesEqual } from '../../utils/comparators/bounds';
import { getItemThumbnailData } from '../../utils/selectPanelHelpers';
import { VisibilityLockControls } from './VisibilityLockControls';
import { useSelectPanelActions } from '../../hooks/useSelectPanelActions';
import { makeShallowComparator } from '../../utils/coreHelpers';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { getEffectiveShift } from '../../utils/effectiveShift';

// Import shared type instead of duplicating
import type { SelectPanelItemData } from './SelectPanel.types';

interface SelectPanelItemProps {
  item: SelectPanelItemData;
  isSelected: boolean;
  isHidden: boolean;
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
  directHidden,
  directLocked,
  canGroup,
  onDuplicate,
  onCopyPath,
}) => {
  // Only subscribe to the specific actions we need
  const createGroup = useCanvasStore(state => state.createGroupFromSelection);
  const isVirtualShiftActive = useCanvasStore(state => state.isVirtualShiftActive);
  
  // Use shared hook for common actions
  const { toggleElementVisibility, toggleElementLock, selectElement } = useSelectPanelActions();

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
  const canCopyPath = item.type === 'element' && item.element.type === 'path';
  const selectedBg = useColorModeValue('gray.200', 'gray.600');
  const defaultBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  const baseTextColor = useColorModeValue('gray.800', 'gray.100');
  const selectedTextColor = useColorModeValue('gray.800', 'gray.200');
  const hiddenTextColor = useColorModeValue('gray.400', 'whiteAlpha.500');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.300');
  const iconMutedColor = useColorModeValue('gray.500', 'gray.400');
  const containerBg = isSelected ? selectedBg : defaultBg;
  const primaryTextColor = isHidden ? hiddenTextColor : isSelected ? selectedTextColor : baseTextColor;
  const secondaryTextColor = isHidden ? hiddenTextColor : mutedTextColor;
  const iconColor = isHidden ? hiddenTextColor : iconMutedColor;

  const itemKey = subpathIndex !== undefined
    ? `${item.element.id}-${item.type}-${subpathIndex}`
    : `${item.element.id}-${item.type}`;

  // Separar las coordenadas para mostrar en líneas diferentes
  const coord1 = bbox ? `${bbox.topLeft.x} , ${bbox.topLeft.y}` : null;
  const coord2 = bbox ? `${bbox.bottomRight.x} , ${bbox.bottomRight.y}` : null;
  const dimensions = bbox ? `${bbox.bottomRight.x - bbox.topLeft.x} ✕ ${bbox.bottomRight.y - bbox.topLeft.y}` : null;

  // Handler for element selection with shift support
  const handleSelectElement = (id: string, multiSelect?: boolean) => {
    const effectiveMultiSelect = multiSelect !== undefined 
      ? getEffectiveShift(multiSelect, isVirtualShiftActive) 
      : false;
    selectElement(id, effectiveMultiSelect);
  };

  return (
    <HStack
      key={itemKey}
      spacing={2}
      px={1}
      py={1}
      bg={containerBg}
      borderRadius="xl"
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
      <HStack spacing={0} align="center">
        <Text
          fontWeight="500"
          fontSize="10px"
          color={primaryTextColor}
          lineHeight="1.4"
        >
          {item.type === 'element' ? 'path' : `subpath-${subpathIndex ?? 0}`}
        </Text>
        <ConditionalTooltip label={`${item.pointCount} points`}>
          <Text
            fontWeight="500"
            fontSize="10px"
            color={primaryTextColor}
            lineHeight="1.4"
          >
            {` (${item.pointCount})`}
          </Text>
        </ConditionalTooltip>
        {item.type === 'element' && (
          <ConditionalTooltip label={`Z-index: ${item.element.zIndex}`}>
            <Text
              fontWeight="500"
              fontSize="10px"
              color={primaryTextColor}
              lineHeight="1.4"
            >
              {` z: ${item.element.zIndex}`}
            </Text>
          </ConditionalTooltip>
        )}
      </HStack>
      {/* Línea 2: Dimensiones */}
      <ConditionalTooltip label={`Dimensions: ${dimensions ?? '—'}`}>
        <HStack spacing={1} align="center">
          <Icon as={RulerDimensionLine} boxSize={3} color={iconColor} />
          <Text
            fontSize="9px"
            color={secondaryTextColor}
            lineHeight="1.4"
          >
            {dimensions ?? '—'}
          </Text>
        </HStack>
      </ConditionalTooltip>
      {/* Línea 3: Primera coordenada */}
      <ConditionalTooltip label={`Top-left corner: ${coord1 ?? '—'}`}>
        <HStack spacing={1} align="center">
          <Icon as={MoveUpLeft} boxSize={3} color={iconColor} />
          <Text
            fontSize="9px"
            color={secondaryTextColor}
            lineHeight="1.4"
          >
            {coord1 ?? '—'}
          </Text>
        </HStack>
      </ConditionalTooltip>
      {/* Línea 4: Segunda coordenada */}
      <ConditionalTooltip label={`Bottom-right corner: ${coord2 ?? '—'}`}>
        <HStack spacing={1} align="center">
          <Icon as={MoveDownRight} boxSize={3} color={iconColor} />
          <Text
            fontSize="9px"
            color={secondaryTextColor}
            lineHeight="1.4"
          >
            {coord2 ?? '—'}
          </Text>
          </HStack>
        </ConditionalTooltip>
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
        {/* Fila 2: Lock, View, Select - using shared component */}
        {item.type === 'element' && (
          <VisibilityLockControls
            elementId={elementId}
            isHidden={directHidden}
            isLocked={directLocked}
            onToggleVisibility={toggleElementVisibility}
            onToggleLock={toggleElementLock}
            onSelect={handleSelectElement}
            hideLabel="Hide element"
            showLabel="Show element"
            lockLabel="Lock element"
            unlockLabel="Unlock element"
            selectLabel="Select element"
          />
        )}
      </VStack>
    </HStack>
  );
};

// Create a shallow comparator for basic props (type assertion needed due to interface)
const compareBasicProps = makeShallowComparator<SelectPanelItemProps & Record<string, unknown>>([
  'isSelected',
  'isHidden',
  'directHidden',
  'directLocked',
  'canGroup'
]);

// Custom comparison function - only re-render if these specific props change
const arePropsEqual = (prevProps: SelectPanelItemProps, nextProps: SelectPanelItemProps): boolean => {
  // Check if basic flags changed using shallow comparator
  if (!compareBasicProps(prevProps as SelectPanelItemProps & Record<string, unknown>, nextProps as SelectPanelItemProps & Record<string, unknown>)) {
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
