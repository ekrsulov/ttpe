import React from 'react';
import { ToggleButton } from './ToggleButton';

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
        <ToggleButton
          key={option.value}
          isActive={value === option.value}
          onClick={() => onChange(option.value)}
          aria-label={`${title}: ${option.description}`}
          title={`${title}: ${option.description}`}
          variant="text"
        >
          {option.label}
        </ToggleButton>
      ))}
    </div>
  );
};
