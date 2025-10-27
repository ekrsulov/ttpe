import React from 'react';
import { VStack, Tag, Text } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../components/ui/Panel';
import { PanelToggle } from '../../components/ui/PanelToggle';
import { usePanelToggleHandlers } from '../../hooks/usePanelToggleHandlers';

export const TransformationPanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const transformation = useCanvasStore(state => state.transformation);
  const updateTransformationState = useCanvasStore(state => state.updateTransformationState);
  const isWorkingWithSubpaths = useCanvasStore(state => state.isWorkingWithSubpaths);
  
  const { createToggleHandler } = usePanelToggleHandlers(updateTransformationState ?? (() => {}));
  
  const { showCoordinates, showRulers } = transformation ?? { showCoordinates: false, showRulers: false };

  const isSubpathMode = isWorkingWithSubpaths?.() ?? false;
  const selectedCount = isSubpathMode ? (selectedSubpaths?.length ?? 0) : selectedIds.length;

  return (
    <Panel 
      title="Transform"
      headerActions={isSubpathMode && (
        <Tag size="sm" colorScheme="purple" fontSize="xs">
          Subpath
        </Tag>
      )}
    >
      <VStack spacing={2} align="stretch">
        {selectedCount === 0 && (
          <Text fontSize="xs" color="gray.500">
            {`Select ${isSubpathMode ? 'a subpath' : 'an element'} to transform`}
          </Text>
        )}

        <VStack spacing={2} align="stretch">
          <PanelToggle
            isChecked={showCoordinates}
            onChange={createToggleHandler('showCoordinates')}
          >
            Coordinates
          </PanelToggle>

          <PanelToggle
            isChecked={showRulers}
            onChange={createToggleHandler('showRulers')}
          >
            Rulers
          </PanelToggle>
        </VStack>
      </VStack>
    </Panel>
  );
};