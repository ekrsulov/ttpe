import React from 'react';
import { IconButton as ChakraIconButton } from '@chakra-ui/react';

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
    { value: 'nonzero', label: 'NZ', description: 'Non-Zero Winding Rule' },
    { value: 'evenodd', label: 'EO', description: 'Even-Odd Rule' }
  ];

  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {fillRuleOptions.map(option => {
        return (
          <ChakraIconButton
            key={option.value}
            aria-label={`${title}: ${option.description}`}
            onPointerUp={() => onChange(option.value)}
            colorScheme={value === option.value ? 'blue' : 'gray'}
            variant={value === option.value ? 'solid' : 'outline'}
            size="xs"
            minW="20px"
            h="20px"
            title={`${title}: ${option.description}`}
            icon={
              <span style={{ fontSize: '10px', fontWeight: 'bold' }}>
                {option.label}
              </span>
            }
          />
        );
      })}
    </div>
  );
};