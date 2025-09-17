import React from 'react';
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
    <button
      onClick={handleClick}
      style={{
        width: '20px',
        height: '20px',
        border: 'none',
        borderRadius: '3px',
        backgroundColor: '#fff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1px',
        transition: 'all 0.2s ease',
        boxShadow: isActive ? '0 0 0 1px #007bff' : 'none'
      }}
      title={preset.name}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
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
    </button>
  );
};