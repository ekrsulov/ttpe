import React from 'react';
import { VStack, Checkbox as ChakraCheckbox, Tag, Text } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { VectorSquare } from 'lucide-react';
import { Panel } from '../ui/Panel';

export const TransformationPanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const transformation = useCanvasStore(state => state.transformation);
  const updateTransformationState = useCanvasStore(state => state.updateTransformationState);
  const isWorkingWithSubpaths = useCanvasStore(state => state.isWorkingWithSubpaths);
  
  const { showCoordinates, showRulers } = transformation;

  const isSubpathMode = isWorkingWithSubpaths();
  const selectedCount = isSubpathMode ? selectedSubpaths.length : selectedIds.length;

  return (
    <Panel 
      icon={<VectorSquare size={16} />} 
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
          <ChakraCheckbox
            isChecked={showCoordinates}
            onChange={(e) => updateTransformationState({ showCoordinates: e.target.checked })}
            size="sm"
            sx={{
              '& .chakra-checkbox__control': {
                bg: showCoordinates ? 'blue.500' : 'transparent',
                borderColor: showCoordinates ? 'blue.500' : 'gray.400',
                _checked: {
                  bg: 'blue.500',
                  borderColor: 'blue.500',
                  color: 'white',
                  _hover: {
                    bg: 'blue.600',
                    borderColor: 'blue.600',
                  }
                },
                _hover: {
                  bg: showCoordinates ? 'blue.600' : 'gray.50',
                  borderColor: showCoordinates ? 'blue.600' : 'gray.400',
                }
              }
            }}
          >
            Coordinates
          </ChakraCheckbox>

          <ChakraCheckbox
            isChecked={showRulers}
            onChange={(e) => updateTransformationState({ showRulers: e.target.checked })}
            size="sm"
            sx={{
              '& .chakra-checkbox__control': {
                bg: showRulers ? 'blue.500' : 'transparent',
                borderColor: showRulers ? 'blue.500' : 'gray.400',
                _checked: {
                  bg: 'blue.500',
                  borderColor: 'blue.500',
                  color: 'white',
                  _hover: {
                    bg: 'blue.600',
                    borderColor: 'blue.600',
                  }
                },
                _hover: {
                  bg: showRulers ? 'blue.600' : 'gray.50',
                  borderColor: showRulers ? 'blue.600' : 'gray.400',
                }
              }
            }}
          >
            Rulers
          </ChakraCheckbox>
        </VStack>
      </VStack>
    </Panel>
  );
};