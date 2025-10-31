import React from 'react';
import { Button } from '@chakra-ui/react';

interface LinecapSelectorProps {
  value: 'butt' | 'round' | 'square';
  onChange: (value: 'butt' | 'round' | 'square') => void;
  title?: string;
}

export const LinecapSelector: React.FC<LinecapSelectorProps> = ({
  value,
  onChange,
  title: _title = "Stroke Linecap"
}) => {
  const linecapOptions: Array<{
    value: 'butt' | 'round' | 'square';
    label: string;
    description: string;
  }> = [
    { value: 'butt', label: 'Butt', description: 'Butt Cap - Flat end exactly at line end' },
    { value: 'round', label: 'Round', description: 'Round Cap - Rounded end extending beyond line end' },
    { value: 'square', label: 'Square', description: 'Square Cap - Square end extending beyond line end' }
  ];

  return (
    <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
      {linecapOptions.map(option => (
        <Button
          key={option.value}
          aria-label={`${option.label}: ${option.description}`}
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
          title={`${option.label}: ${option.description}`}
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
