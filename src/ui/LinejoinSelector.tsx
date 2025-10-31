import React from 'react';
import { ToggleButton } from './ToggleButton';

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
