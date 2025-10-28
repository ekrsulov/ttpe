import React from 'react';
import { IconButton as ChakraIconButton } from '@chakra-ui/react';
import { Minus } from 'lucide-react';
import ConditionalTooltip from './ConditionalTooltip';
import { DASH_PRESETS } from '../../utils/dashPresets';

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
  return (
    <input
      type="text"
      value={value === 'none' ? '' : value}
      onChange={(e) => onChange(e.target.value || 'none')}
      placeholder="5,3,2,3"
      style={{
        width: '100%',
        padding: '4px 6px',
        border: '1px solid #ccc',
        borderRadius: '3px',
        fontSize: '11px',
        color: '#333',
        backgroundColor: '#fff'
      }}
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
  // Select 7 most useful dash presets (increased from 5)
  const commonPresets = [
    DASH_PRESETS[0],  // Solid
    DASH_PRESETS[1],  // Dashed
    DASH_PRESETS[2],  // Dotted
    DASH_PRESETS[3],  // Dash-Dot
    DASH_PRESETS[12], // Dense Dots
    DASH_PRESETS[13], // Zigzag (new)
    DASH_PRESETS[14], // Micro Dash (new)
  ];

  return (
    <div style={{ 
      display: 'flex',
      justifyContent: 'space-between',
      width: '100%',
      flexWrap: 'nowrap' // Keep all buttons in one line
    }}>
      {commonPresets.map(preset => (
        <ConditionalTooltip key={preset.id} label={`${preset.name}: ${preset.description}`}>
          <ChakraIconButton
            aria-label={`${preset.name}: ${preset.description}`}
            onPointerUp={() => onChange(preset.dashArray)}
            colorScheme={value === preset.dashArray ? 'blue' : 'gray'}
            variant={value === preset.dashArray ? 'solid' : 'outline'}
            size="xs"
            minW="20px"
            h="20px"
            icon={<DashPreview dashArray={preset.dashArray} />}
          />
        </ConditionalTooltip>
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
          <ChakraIconButton
            key={preset.id}
            aria-label={`${preset.name}: ${preset.description}`}
            onPointerUp={() => onChange(preset.dashArray)}
            colorScheme={value === preset.dashArray ? 'blue' : 'gray'}
            variant={value === preset.dashArray ? 'solid' : 'outline'}
            size="xs"
            minW="20px"
            h="20px"
            title={`${preset.name}: ${preset.description}`}
            icon={<DashPreview dashArray={preset.dashArray} />}
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