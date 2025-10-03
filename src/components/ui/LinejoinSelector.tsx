import React from 'react';
import { IconButton as ChakraIconButton } from '@chakra-ui/react';
import { Square, Circle, ChevronRight } from 'lucide-react';

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
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    description: string;
  }> = [
    { value: 'miter', icon: Square, label: 'Miter', description: 'Miter Join - Sharp corner with pointed edge' },
    { value: 'round', icon: Circle, label: 'Round', description: 'Round Join - Rounded corner' },
    { value: 'bevel', icon: ChevronRight, label: 'Bevel', description: 'Bevel Join - Flattened corner' }
  ];

  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {linejoinOptions.map(option => {
        const IconComponent = option.icon;
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
            icon={<IconComponent size={12} />}
          />
        );
      })}
    </div>
  );
};