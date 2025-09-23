import React from 'react';

interface SliderControlProps {
  icon?: React.ReactNode;
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatter?: (value: number) => string;
  title?: string;
  minWidth?: string;
  labelWidth?: string;
  valueWidth?: string;
  marginBottom?: string;
  inline?: boolean; // New prop for inline usage
  gap?: string; // Custom gap for inline usage
}

export const SliderControl: React.FC<SliderControlProps> = ({
  icon,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  formatter,
  title,
  minWidth = '60px',
  labelWidth = '40px',
  valueWidth = '31px',
  marginBottom = '6px',
  inline = false,
  gap = '8px'
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value);
    onChange(newValue);
  };

  const formattedValue = formatter ? formatter(value) : (step < 1 ? value.toFixed(2) : value.toString());

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap,
      marginBottom: inline ? '0' : marginBottom,
      width: inline ? '100%' : undefined
    }}>
      {icon && (
        <div style={{ color: '#666', flexShrink: 0 }}>
          {icon}
        </div>
      )}
      {label && (
        <span style={{
          fontSize: '11px',
          color: '#666',
          minWidth: labelWidth,
          flexShrink: 0
        }}>
          {label}
        </span>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        style={{
          flex: 1,
          height: '4px',
          borderRadius: '2px',
          background: '#ddd',
          outline: 'none',
          cursor: 'pointer',
          minWidth
        }}
        title={title}
      />
      <span style={{
        fontSize: '10px',
        color: '#666',
        width: valueWidth,
        textAlign: 'right',
        flexShrink: 0
      }}>
        {formattedValue}
      </span>
    </div>
  );
};