import React from 'react';
import { TEXT_STYLES } from './FormStyles';

/**
 * Props for SelectionInfo component
 */
interface SelectionInfoProps {
  /**
   * Current active plugin
   */
  activePlugin: string | null;
  /**
   * Number of selected regular elements
   */
  selectedCount: number;
  /**
   * Number of selected commands (for edit mode)
   */
  selectedCommandsCount?: number;
  /**
   * Number of selected subpaths (for subpath mode)
   */
  selectedSubpathsCount?: number;
  /**
   * Whether currently in subpath mode
   */
  isSubpathMode?: boolean;
  /**
   * Custom no selection message
   */
  noSelectionMessage?: string;
  /**
   * Custom style override
   */
  style?: React.CSSProperties;
}

/**
 * Component that displays selection information consistently across panels
 */
export const SelectionInfo: React.FC<SelectionInfoProps> = ({
  activePlugin,
  selectedCount,
  selectedCommandsCount = 0,
  selectedSubpathsCount = 0,
  isSubpathMode = false,
  noSelectionMessage,
  style = {}
}) => {
  // Determine what type of selection we're dealing with
  const getSelectionInfo = () => {
    if (isSubpathMode) {
      return {
        count: selectedSubpathsCount,
        type: 'subpath',
        hasSelection: selectedSubpathsCount > 0
      };
    }
    
    if (activePlugin === 'edit') {
      return {
        count: selectedCommandsCount,
        type: 'point',
        hasSelection: selectedCommandsCount > 0
      };
    }
    
    return {
      count: selectedCount,
      type: 'element',
      hasSelection: selectedCount > 0
    };
  };

  const { count, type, hasSelection } = getSelectionInfo();

  // Default no selection messages based on context
  const getDefaultNoSelectionMessage = () => {
    if (noSelectionMessage) return noSelectionMessage;
    
    if (isSubpathMode) return 'Select a subpath';
    if (activePlugin === 'edit') return 'Select points to edit';
    return 'Select an element';
  };

  if (!hasSelection) {
    return (
      <div style={{ ...TEXT_STYLES.helpText, ...style }}>
        {getDefaultNoSelectionMessage()}
      </div>
    );
  }

  return (
    <div style={{ ...TEXT_STYLES.infoText, ...style }}>
      {count} {type}{count !== 1 ? 's' : ''} selected
    </div>
  );
};

/**
 * Props for ModeIndicator component
 */
interface ModeIndicatorProps {
  /**
   * Whether in subpath mode
   */
  isSubpathMode?: boolean;
  /**
   * Whether in edit mode
   */
  isEditMode?: boolean;
  /**
   * Custom mode text
   */
  customMode?: string;
  /**
   * Custom style
   */
  style?: React.CSSProperties;
}

/**
 * Component that displays current mode indicator
 */
export const ModeIndicator: React.FC<ModeIndicatorProps> = ({
  isSubpathMode = false,
  isEditMode = false,
  customMode,
  style = {}
}) => {
  const getModeText = () => {
    if (customMode) return customMode;
    if (isSubpathMode) return 'Subpath';
    if (isEditMode) return 'Edit';
    return null;
  };

  const modeText = getModeText();
  
  if (!modeText) return null;

  return (
    <span style={{ ...TEXT_STYLES.badge, ...style }}>
      {modeText}
    </span>
  );
};

/**
 * Props for ActionButtons component
 */
interface ActionButtonsProps {
  /**
   * Array of button configurations
   */
  buttons: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    variant?: 'primary' | 'secondary';
    title?: string;
  }>;
  /**
   * Layout direction
   */
  direction?: 'row' | 'column';
  /**
   * Gap between buttons
   */
  gap?: string;
  /**
   * Custom style
   */
  style?: React.CSSProperties;
}

/**
 * Component for rendering consistent action buttons
 */
export const ActionButtons: React.FC<ActionButtonsProps> = ({
  buttons,
  direction = 'row',
  gap = '4px',
  style = {}
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        gap,
        ...style
      }}
    >
      {buttons.map((button, index) => (
        <button
          key={index}
          onClick={button.disabled ? undefined : button.onClick}
          disabled={button.disabled}
          title={button.title}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            backgroundColor: button.disabled 
              ? '#f8f9fa' 
              : button.variant === 'primary' ? '#007bff' : '#f8f9fa',
            color: button.disabled
              ? '#999'
              : button.variant === 'primary' ? '#fff' : '#333',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: button.disabled ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            flex: 1,
            minWidth: 0,
            gap: '4px',
            opacity: button.disabled ? 0.6 : 1
          }}
        >
          {button.icon}
          {button.label}
        </button>
      ))}
    </div>
  );
};