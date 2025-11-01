import React from 'react';
import { Input, useColorModeValue } from '@chakra-ui/react';
import { Minus } from 'lucide-react';
import { ToggleButton } from './ToggleButton';
import { DASH_PRESETS } from '../utils/dashPresets';

interface DashArraySelectorProps {
  value: string;
  onChange: (value: string) => void;
  title?: string;
}

interface DashArrayCustomInputProps {
  value: string;
  onChange: (value: string) => void;
  title?: string;
}

export const DashArrayCustomInput: React.FC<DashArrayCustomInputProps> = ({
  value,
  onChange,
  title = "Custom dash array"
}) => {
  // Colors that adapt to dark mode
  const inputBg = useColorModeValue('white', 'whiteAlpha.100');
  const inputBorder = useColorModeValue('gray.300', 'whiteAlpha.300');
  const inputColor = useColorModeValue('gray.800', 'gray.100');
  const placeholderColor = useColorModeValue('gray.500', 'gray.500');

  return (
    <Input
      type="text"
      value={value === 'none' ? '' : value}
      onChange={(e) => onChange(e.target.value || 'none')}
      placeholder="5,3,2,3"
      size="xs"
      fontSize="11px"
      minWidth="90px"
      h="20px"
      bg={inputBg}
      borderColor={inputBorder}
      color={inputColor}
      _placeholder={{ color: placeholderColor }}
      title={title}
    />
  );
};

interface DashArrayPresetsProps {
  value: string;
  onChange: (value: string) => void;
}

export const DashArrayPresets: React.FC<DashArrayPresetsProps> = ({
  value,
  onChange
}) => {
  // Select only 2 most useful dash presets: Solid and Dashed
  const commonPresets = [
    DASH_PRESETS[0],  // Solid
    DASH_PRESETS[1],  // Dashed
  ];

  return (
    <div style={{ 
      display: 'flex',
      justifyContent: 'space-between',
      width: '44px',
      flexWrap: 'nowrap' // Keep all buttons in one line
    }}>
      {commonPresets.map(preset => (
        <ToggleButton
          key={preset.id}
          isActive={value === preset.dashArray}
          onClick={() => onChange(preset.dashArray)}
          aria-label={`${preset.name}: ${preset.description}`}
          variant="icon"
          icon={<DashPreview dashArray={preset.dashArray} />}
          sx={{ borderRadius: 'full' }}
        />
      ))}
    </div>
  );
};

export const DashArraySelector: React.FC<DashArraySelectorProps> = ({
  value,
  onChange,
  title = "Stroke Dash Array"
}) => {
  return (
    <div>
      <div style={{
        fontSize: '10px',
        color: '#666',
        marginBottom: '4px',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px'
      }}>
        {title}
      </div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '2px',
        marginBottom: '6px'
      }}>
        {DASH_PRESETS.slice(0, 8).map(preset => (
          <ToggleButton
            key={preset.id}
            isActive={value === preset.dashArray}
            onClick={() => onChange(preset.dashArray)}
            aria-label={`${preset.name}: ${preset.description}`}
            variant="icon"
            icon={<DashPreview dashArray={preset.dashArray} />}
            sx={{ borderRadius: 'full' }}
          />
        ))}
      </div>
      {/* Custom input */}
      <input
        type="text"
        value={value === 'none' ? '' : value}
        onChange={(e) => onChange(e.target.value || 'none')}
        placeholder="Custom: 5,3,2,3"
        style={{
          width: '100%',
          padding: '4px 6px',
          border: '1px solid #ccc',
          borderRadius: '3px',
          fontSize: '11px',
          color: '#333',
          backgroundColor: '#fff'
        }}
        title="Custom dash array (e.g., 5,3,2,3)"
      />
    </div>
  );
};

// Simple dash preview component
const DashPreview: React.FC<{ dashArray: string }> = ({ dashArray }) => {
  if (dashArray === 'none') {
    return <Minus size={12} />;
  }

  return (
    <svg width="16" height="2" style={{ overflow: 'visible' }}>
      <line
        x1="0"
        y1="1"
        x2="16"
        y2="1"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray={dashArray}
      />
    </svg>
  );
};