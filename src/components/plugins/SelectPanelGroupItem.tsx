import React, { memo } from 'react';
import { Box, HStack, VStack, Text, Editable, EditableInput, EditablePreview } from '@chakra-ui/react';
import { ChevronDown, ChevronRight, Ungroup as UngroupIcon, Lock, EyeOff, MousePointer2 } from 'lucide-react';
import type { GroupElement, PathData, Command, CanvasElement } from '../../types';
import { useCanvasStore } from '../../store/canvasStore';
import { PathThumbnail } from '../ui/PathThumbnail';
import { PanelActionButton } from '../ui/PanelActionButton';
import { VisibilityLockControls } from './VisibilityLockControls';
import { useSelectPanelActions } from '../../hooks/useSelectPanelActions';

interface SelectPanelGroupItemProps {
  group: GroupElement;
  isSelected: boolean;
  hasSelectedDescendant: boolean;
  elements: CanvasElement[];
}

const SelectPanelGroupItemComponent: React.FC<SelectPanelGroupItemProps> = ({
  group,
  isSelected,
  hasSelectedDescendant,
  elements,
}) => {
  // Only subscribe to the specific actions we need
  const ungroupGroupById = useCanvasStore(state => state.ungroupGroupById);
  const renameGroup = useCanvasStore(state => state.renameGroup);
  const setGroupExpanded = useCanvasStore(state => state.setGroupExpanded);
  const isElementHidden = useCanvasStore(state => state.isElementHidden);
  const isElementLocked = useCanvasStore(state => state.isElementLocked);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  
  // Use shared hook for common actions
  const { toggleGroupVisibility, toggleGroupLock, selectGroup, selectElement } = useSelectPanelActions();

  const groupData = group.data;
  const groupHidden = isElementHidden(group.id);
  const groupLocked = isElementLocked(group.id);

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

  const selectedIdSet = new Set(selectedIds);

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
          <VisibilityLockControls
            elementId={group.id}
            isHidden={groupHidden}
            isLocked={groupLocked}
            onToggleVisibility={toggleGroupVisibility}
            onToggleLock={toggleGroupLock}
            onSelect={selectGroup}
            hideLabel="Hide group"
            showLabel="Show group"
            lockLabel="Lock group"
            unlockLabel="Unlock group"
            selectLabel="Select group"
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
                : `${child.type}-${child.id.slice(-4)}`;
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
                    onClick={() => selectElement(childId)}
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

// Custom comparison function - only re-render if these specific props change
const arePropsEqual = (prevProps: SelectPanelGroupItemProps, nextProps: SelectPanelGroupItemProps): boolean => {
  // Check if basic flags changed
  if (
    prevProps.isSelected !== nextProps.isSelected ||
    prevProps.hasSelectedDescendant !== nextProps.hasSelectedDescendant
  ) {
    return false;
  }

  // Check if group ID or group data changed
  if (prevProps.group.id !== nextProps.group.id) {
    return false;
  }

  const prevGroupData = prevProps.group.data;
  const nextGroupData = nextProps.group.data;

  // Check if relevant group data properties changed
  if (
    prevGroupData.name !== nextGroupData.name ||
    prevGroupData.isExpanded !== nextGroupData.isExpanded ||
    prevGroupData.childIds.length !== nextGroupData.childIds.length
  ) {
    return false;
  }

  // Check if child IDs changed (shallow comparison)
  for (let i = 0; i < prevGroupData.childIds.length; i++) {
    if (prevGroupData.childIds[i] !== nextGroupData.childIds[i]) {
      return false;
    }
  }

  // Check if elements array reference changed (we rely on parent to pass stable reference)
  if (prevProps.elements !== nextProps.elements) {
    return false;
  }

  // Props are equal
  return true;
};

export const SelectPanelGroupItem = memo(SelectPanelGroupItemComponent, arePropsEqual);
