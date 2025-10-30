import React from 'react';
import { Button } from '@chakra-ui/react';
import ConditionalTooltip from './ConditionalTooltip';
import type { Preset } from '../../utils/fillAndStrokePresets';

interface PresetButtonProps {
  preset: Preset;
  onClick: (preset: Preset) => void;
  isActive?: boolean;
}

export const PresetButton: React.FC<PresetButtonProps> = ({ preset, onClick, isActive = false }) => {
  const handleClick = () => {
    onClick(preset);
  };

  return (
    <ConditionalTooltip label={preset.name}>
      <Button
        onClick={handleClick}
        w="20px"
        h="20px"
        minW="20px"
        p="1px"
        bg="white"
        borderRadius="md"
        border="none"
        boxShadow={isActive ? '0 0 0 1px var(--chakra-colors-blue-500)' : 'none'}
        _hover={{ transform: 'scale(1.05)' }}
        transition="all 0.2s ease"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          style={{ borderRadius: '2px' }}
        >
          {/* Sample shape with preset styling - full size */}
          <circle
            cx="10"
            cy="10"
            r="9"
            fill={preset.fillColor === 'none' ? 'transparent' : preset.fillColor}
            fillOpacity={preset.fillOpacity}
            stroke={preset.strokeColor === 'none' ? 'transparent' : preset.strokeColor}
            strokeWidth={Math.max(0.5, preset.strokeWidth * 0.25)} // Scale down for preview
            strokeOpacity={preset.strokeOpacity}
          />

          {/* Inner accent for better visibility */}
          {preset.fillColor !== 'none' && (
            <circle
              cx="10"
              cy="10"
              r="4"
              fill="rgba(255,255,255,0.3)"
            />
          )}
        </svg>
      </Button>
    </ConditionalTooltip>
  );
};