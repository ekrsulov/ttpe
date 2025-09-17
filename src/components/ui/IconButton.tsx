import React from 'react';

interface IconButtonProps {
  onClick?: () => void;
  onPointerUp?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
  size?: 'small' | 'medium' | 'custom';
  customSize?: string;
  active?: boolean;
  activeBgColor?: string;
  activeColor?: string;
  borderColor?: string;
  transition?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  onPointerUp,
  disabled = false,
  children,
  title,
  size = 'medium',
  customSize,
  active = false,
  activeBgColor = '#007bff',
  activeColor = '#fff',
  borderColor = '#dee2e6',
  transition = 'all 0.1s ease'
}) => {
  const getButtonSize = () => {
    if (size === 'small') return '32px';
    if (size === 'custom' && customSize) return customSize;
    return '36px'; // medium
  };

  const getPadding = () => {
    if (size === 'small') return '4px';
    if (size === 'custom' && customSize) {
      // Extract numeric value from customSize (e.g., "12px" -> 12)
      const numericSize = parseInt(customSize.replace('px', ''));
      if (numericSize <= 16) return '2px';
      if (numericSize <= 24) return '3px';
      return '4px';
    }
    return '6px'; // medium
  };

  const buttonSize = getButtonSize();
  const padding = getPadding();

  return (
    <button
      onPointerUp={onPointerUp || onClick}
      disabled={disabled}
      title={title}
      style={{
        padding,
        backgroundColor: disabled ? '#f8f9fa' : (active ? activeBgColor : '#f8f9fa'),
        color: disabled ? '#6c757d' : (active ? activeColor : '#333'),
        border: `1px solid ${borderColor}`,
        borderRadius: '3px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        minWidth: buttonSize,
        minHeight: buttonSize,
        opacity: disabled ? 0.5 : 1,
        transition
      }}
    >
      {children}
    </button>
  );
};