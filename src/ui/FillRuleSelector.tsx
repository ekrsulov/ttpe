import React from 'react';
import { Button } from '@chakra-ui/react';

interface FillRuleSelectorProps {
  value: 'nonzero' | 'evenodd';
  onChange: (value: 'nonzero' | 'evenodd') => void;
  title?: string;
}

export const FillRuleSelector: React.FC<FillRuleSelectorProps> = ({
  value,
  onChange,
  title = "Fill Rule"
}) => {
  const fillRuleOptions: Array<{
    value: 'nonzero' | 'evenodd';
    label: string;
    description: string;
  }> = [
    { value: 'nonzero', label: 'Non-Zero', description: 'Non-Zero Winding Rule' },
    { value: 'evenodd', label: 'Even-Odd', description: 'Even-Odd Rule' }
  ];

  return (
    <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
      {fillRuleOptions.map(option => (
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
