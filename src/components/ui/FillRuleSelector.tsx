import React from 'react';
import { IconButton } from './IconButton';

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
          <IconButton
            key={option.value}
            onPointerUp={() => onChange(option.value)}
            active={value === option.value}
            activeBgColor="#007bff"
            activeColor="#fff"
            size="custom"
            customSize="20px"
            title={`${title}: ${option.description}`}
          >
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>
              {option.label}
            </span>
          </IconButton>
        );
      })}
    </div>
  );
};