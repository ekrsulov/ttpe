import React from 'react';
import { ToggleButton } from './ToggleButton';

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
        <ToggleButton
          key={option.value}
          isActive={value === option.value}
          onClick={() => onChange(option.value)}
          aria-label={`${option.label}: ${option.description}`}
          title={`${option.label}: ${option.description}`}
          variant="text"
        >
          {option.label}
        </ToggleButton>
      ))}
    </div>
  );
};
