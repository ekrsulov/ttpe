import React from 'react';
import { VStack, HStack, Button, Text } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Pen } from 'lucide-react';
import { Panel } from '../../components/ui/Panel';

export const PencilPanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const pencil = useCanvasStore(state => state.pencil);
  const updatePencilState = useCanvasStore(state => state.updatePencilState);

  const handleReusePathToggle = () => {
    updatePencilState?.({ reusePath: !(pencil?.reusePath ?? false) });
  };

  return (
    <Panel icon={<Pen size={16} />} title="Pencil">
      <VStack spacing={2} align="stretch">
        {/* Path Mode Selection */}
        <HStack spacing={1} justify="space-between">
          <Text fontSize="12px" color="gray.600">Path Mode:</Text>
          <HStack spacing={1}>
            <Button
              aria-label="New Path"
              onClick={handleReusePathToggle}
              variant="unstyled"
              size="sm"
              bg={!(pencil?.reusePath ?? false) ? 'blue.500' : 'transparent'}
              color={!(pencil?.reusePath ?? false) ? 'white' : 'gray.700'}
              border="1px solid"
              borderColor={!(pencil?.reusePath ?? false) ? 'blue.500' : 'gray.400'}
              borderRadius="md"
              fontWeight="medium"
              fontSize="11px"
              transition="all 0.2s"
              _hover={{
                bg: !(pencil?.reusePath ?? false) ? 'blue.600' : 'gray.50'
              }}
              sx={{
                h: '24px',
                px: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              New
            </Button>
            <Button
              aria-label="Add Subpath"
              onClick={handleReusePathToggle}
              variant="unstyled"
              size="sm"
              bg={(pencil?.reusePath ?? false) ? 'blue.500' : 'transparent'}
              color={(pencil?.reusePath ?? false) ? 'white' : 'gray.700'}
              border="1px solid"
              borderColor={(pencil?.reusePath ?? false) ? 'blue.500' : 'gray.400'}
              borderRadius="md"
              fontWeight="medium"
              fontSize="11px"
              transition="all 0.2s"
              _hover={{
                bg: (pencil?.reusePath ?? false) ? 'blue.600' : 'gray.50'
              }}
              sx={{
                h: '24px',
                px: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Add
            </Button>
          </HStack>
        </HStack>
      </VStack>
    </Panel>
  );
};