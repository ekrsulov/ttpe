import React from 'react';

interface ConditionalPanelProps {
  /**
   * Whether to show the panel content
   */
  condition: boolean;
  /**
   * Content to render when condition is true
   */
  children: React.ReactNode;
  /**
   * Custom className for the wrapper div
   */
  className?: string;
  /**
   * Custom inline styles for the wrapper div
   */
  style?: React.CSSProperties;
}

/**
 * A wrapper component that conditionally renders children based on a boolean condition.
 * Useful for showing/hiding panels in the sidebar and other conditional UI elements.
 */
export const ConditionalPanel: React.FC<ConditionalPanelProps> = ({ 
  condition, 
  children, 
  className,
  style = {} 
}) => (
  <div 
    className={className}
    style={{ 
      display: condition ? 'block' : 'none', 
      ...style 
    }}
  >
    {children}
  </div>
);