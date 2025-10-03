import React from 'react';
import { Button } from '@chakra-ui/react';
import type { Preset } from '../../utils/presets';

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
      title={preset.name}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 32 32"
        style={{ borderRadius: '2px' }}
      >
        {/* Background */}
        <rect
          x="0"
          y="0"
          width="32"
          height="32"
          fill="#f8f9fa"
          rx="2"
        />

        {/* Sample shape with preset styling */}
        <circle
          cx="16"
          cy="16"
          r="8"
          fill={preset.fillColor === 'none' ? 'transparent' : preset.fillColor}
          fillOpacity={preset.fillOpacity}
          stroke={preset.strokeColor === 'none' ? 'transparent' : preset.strokeColor}
          strokeWidth={Math.max(0.5, preset.strokeWidth * 0.25)} // Scale down for preview
          strokeOpacity={preset.strokeOpacity}
        />

        {/* Inner accent for better visibility */}
        {preset.fillColor !== 'none' && (
          <circle
            cx="16"
            cy="16"
            r="4"
            fill="rgba(255,255,255,0.3)"
          />
        )}
      </svg>
    </Button>
  );
};