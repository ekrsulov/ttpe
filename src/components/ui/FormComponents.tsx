import React from 'react';
import { INPUT_STYLES, BUTTON_STYLES, TEXT_STYLES, LAYOUT_STYLES } from './FormStyles';

/**
 * Reusable text input component
 */
interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  style?: React.CSSProperties;
}

export const TextInput: React.FC<TextInputProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  label,
  style = {} 
}) => (
  <div style={LAYOUT_STYLES.flexColumn}>
    {label && <label style={INPUT_STYLES.label}>{label}</label>}
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...INPUT_STYLES.textInput, ...style }}
    />
  </div>
);

/**
 * Reusable checkbox component
 */
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ 
  checked, 
  onChange, 
  label, 
  id 
}) => (
  <div style={LAYOUT_STYLES.flexRow}>
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={INPUT_STYLES.checkbox}
    />
    <label 
      htmlFor={id} 
      style={INPUT_STYLES.checkboxLabel}
    >
      {label}
    </label>
  </div>
);

/**
 * Reusable button component
 */
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'normal' | 'small';
  disabled?: boolean;
  icon?: React.ReactNode;
  title?: string;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'secondary',
  size = 'normal',
  disabled = false,
  icon,
  title,
  style = {} 
}) => {
  const baseStyle = variant === 'primary' ? BUTTON_STYLES.primary : BUTTON_STYLES.secondary;
  const sizeStyle = size === 'small' ? BUTTON_STYLES.small : {};
  const disabledStyle = disabled ? { opacity: 0.6, cursor: 'not-allowed' } : {};

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      style={{ 
        ...baseStyle, 
        ...sizeStyle, 
        ...disabledStyle, 
        ...style 
      }}
    >
      {icon && <span style={{ marginRight: children ? '4px' : '0' }}>{icon}</span>}
      {children}
    </button>
  );
};

/**
 * Section label component
 */
interface SectionLabelProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ 
  children, 
  style = {} 
}) => (
  <div style={{ ...TEXT_STYLES.sectionLabel, ...style }}>
    {children}
  </div>
);

/**
 * Help text component
 */
interface HelpTextProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const HelpText: React.FC<HelpTextProps> = ({ 
  children, 
  style = {} 
}) => (
  <div style={{ ...TEXT_STYLES.helpText, ...style }}>
    {children}
  </div>
);

/**
 * Info badge component
 */
interface InfoBadgeProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const InfoBadge: React.FC<InfoBadgeProps> = ({ 
  children, 
  style = {} 
}) => (
  <span style={{ ...TEXT_STYLES.badge, ...style }}>
    {children}
  </span>
);