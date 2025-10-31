import React from 'react';
import { Button } from '@chakra-ui/react';

interface LinejoinSelectorProps {
  value: 'miter' | 'round' | 'bevel';
  onChange: (value: 'miter' | 'round' | 'bevel') => void;
  title?: string;
}

export const LinejoinSelector: React.FC<LinejoinSelectorProps> = ({
  value,
  onChange,
  title = "Stroke Linejoin"
}) => {
  const linejoinOptions: Array<{
    value: 'miter' | 'round' | 'bevel';
    label: string;
    description: string;
  }> = [
    { value: 'miter', label: 'Miter', description: 'Miter Join - Sharp corner with pointed edge' },
    { value: 'round', label: 'Round', description: 'Round Join - Rounded corner' },
    { value: 'bevel', label: 'Bevel', description: 'Bevel Join - Flattened corner' }
  ];

  return (
    <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
      {linejoinOptions.map(option => (
        <Button
          key={option.value}
          aria-label={`${title}: ${option.description}`}
          onClick={() => onChange(option.value)}
          variant="unstyled"
          size="xs"
          bg={value === option.value ? 'blue.500' : 'transparent'}
          color={value === option.value ? 'white' : 'gray.700'}
          border="1px solid"
          borderColor={value === option.value ? 'blue.500' : 'gray.400'}
          borderRadius="md"
          fontSize="10px"
          fontWeight="medium"
          px={2}
          py={1}
          h="20px"
          flex={1}
          display="flex"
          alignItems="center"
          title={`${title}: ${option.description}`}
          _hover={{
            bg: value === option.value ? 'blue.600' : 'gray.50'
          }}
          _dark={{
            color: value === option.value ? 'white' : 'gray.300',
            borderColor: value === option.value ? 'blue.500' : 'whiteAlpha.400',
            _hover: {
              bg: value === option.value ? 'blue.600' : 'whiteAlpha.100'
            }
          }}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
};
