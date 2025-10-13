import React from 'react';
import { VStack, Checkbox as ChakraCheckbox } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Ruler } from 'lucide-react';
import { Panel } from '../ui/Panel';

const GuidelinesPanelComponent: React.FC = () => {
  // Only subscribe to guidelines state
  const guidelines = useCanvasStore(state => state.guidelines);
  const updateGuidelinesState = useCanvasStore(state => state.updateGuidelinesState);

  const handleToggleGuidelines = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateGuidelinesState({ enabled: e.target.checked });
  };

  const handleToggleDistanceGuidelines = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateGuidelinesState({ distanceEnabled: e.target.checked });
  };

  const handleToggleDebugMode = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateGuidelinesState({ debugMode: e.target.checked });
  };

  return (
    <Panel 
      icon={<Ruler size={16} />} 
      title="Guidelines"
    >
      <VStack spacing={2} align="stretch">
        {/* Alignment Guidelines Toggle */}
        <ChakraCheckbox
          isChecked={guidelines.enabled}
          onChange={handleToggleGuidelines}
          size="sm"
          sx={{
            '& .chakra-checkbox__control': {
              bg: guidelines.enabled ? 'blue.500' : 'transparent',
              borderColor: guidelines.enabled ? 'blue.500' : 'gray.400',
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
                bg: guidelines.enabled ? 'blue.600' : 'gray.50',
                borderColor: guidelines.enabled ? 'blue.600' : 'gray.400',
              }
            }
          }}
        >
          Alignment
        </ChakraCheckbox>

        {/* Distance Guidelines Toggle */}
        <ChakraCheckbox
          isChecked={guidelines.distanceEnabled}
          onChange={handleToggleDistanceGuidelines}
          isDisabled={!guidelines.enabled}
          size="sm"
          sx={{
            '& .chakra-checkbox__control': {
              bg: guidelines.distanceEnabled ? 'blue.500' : 'transparent',
              borderColor: guidelines.distanceEnabled ? 'blue.500' : 'gray.400',
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
                bg: guidelines.distanceEnabled ? 'blue.600' : 'gray.50',
                borderColor: guidelines.distanceEnabled ? 'blue.600' : 'gray.400',
              },
              _disabled: {
                opacity: 0.4,
                cursor: 'not-allowed',
              }
            }
          }}
        >
          Distance
        </ChakraCheckbox>

        {/* Debug Mode Toggle - Only in development */}
        {import.meta.env.DEV && (
          <ChakraCheckbox
            isChecked={guidelines.debugMode || false}
            onChange={handleToggleDebugMode}
            isDisabled={!guidelines.enabled}
            size="sm"
            sx={{
              '& .chakra-checkbox__control': {
                bg: guidelines.debugMode ? 'orange.400' : 'transparent',
                borderColor: guidelines.debugMode ? 'orange.400' : 'gray.400',
                _checked: {
                  bg: 'orange.400',
                  borderColor: 'orange.400',
                  color: 'white',
                  _hover: {
                    bg: 'orange.500',
                    borderColor: 'orange.500',
                  }
                },
                _hover: {
                  bg: guidelines.debugMode ? 'orange.500' : 'gray.50',
                  borderColor: guidelines.debugMode ? 'orange.500' : 'gray.400',
                },
                _disabled: {
                  opacity: 0.4,
                  cursor: 'not-allowed',
                }
              }
            }}
          >
            Debug (show all)
          </ChakraCheckbox>
        )}
      </VStack>
    </Panel>
  );
};

// Export memoized version
export const GuidelinesPanel = React.memo(GuidelinesPanelComponent);
