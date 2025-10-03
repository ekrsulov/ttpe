import React from 'react';
import { IconButton as ChakraIconButton } from '@chakra-ui/react';
import { Square, Circle, Minus } from 'lucide-react';

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
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    description: string;
  }> = [
    { value: 'butt', icon: Minus, label: 'Butt', description: 'Butt Cap - Flat end exactly at line end' },
    { value: 'round', icon: Circle, label: 'Round', description: 'Round Cap - Rounded end extending beyond line end' },
    { value: 'square', icon: Square, label: 'Square', description: 'Square Cap - Square end extending beyond line end' }
  ];

  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {linecapOptions.map(option => {
        const IconComponent = option.icon;
        return (
          <ChakraIconButton
            key={option.value}
            aria-label={`${option.label}: ${option.description}`}
            onPointerUp={() => onChange(option.value)}
            colorScheme={value === option.value ? 'blue' : 'gray'}
            variant={value === option.value ? 'solid' : 'outline'}
            size="xs"
            minW="20px"
            h="20px"
            title={`${option.label}: ${option.description}`}
            icon={<IconComponent size={12} />}
          />
        );
      })}
    </div>
  );
};