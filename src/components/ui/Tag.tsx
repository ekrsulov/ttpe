import React from 'react';

interface TagProps {
  children: React.ReactNode;
  width?: string | number;
  className?: string;
  badge?: boolean;
  title?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export const Tag: React.FC<TagProps> = ({
  children,
  width,
  className = '',
  badge = false,
  title,
  textAlign = 'right'
}) => {
  const style: React.CSSProperties = {
    fontSize: '10px',
    color: '#666',
    textAlign: textAlign,
    flexShrink: 0,
  };

  if (width) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }

  if (badge) {
    style.backgroundColor = '#f8f9fa';
    style.border = 'none';
    style.borderRadius = '12px';
    style.padding = '1px 6px';
    style.fontWeight = '600';
    style.fontSize = '9px';
  }

  return (
    <span
      style={style}
      className={className}
      title={title}
    >
      {children}
    </span>
  );
};