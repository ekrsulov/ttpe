import React from 'react';

/**
 * Common panel styles used throughout the sidebar and other components
 */
// eslint-disable-next-line react-refresh/only-export-components
export const PANEL_STYLES = {
  /**
   * Base panel container style
   */
  panel: {
    backgroundColor: '#fff'
  } as React.CSSProperties,

  /**
   * Panel header with icon and title
   */
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    backgroundColor: '#f5f5f5',
    padding: '4px 8px',
    borderRadius: '4px'
  } as React.CSSProperties,

  /**
   * Panel title text
   */
  title: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#333'
  } as React.CSSProperties,

  /**
   * Icon in panel header
   */
  icon: {
    marginRight: '6px',
    color: '#666'
  } as React.CSSProperties,

  /**
   * Sidebar main container
   */
  sidebarContainer: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    width: '250px',
    height: '100vh',
    backgroundColor: 'rgba(249, 249, 249, 0.95)',
    backdropFilter: 'blur(10px)',
    borderLeft: '1px solid #ccc',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column' as const
  } as React.CSSProperties,

  /**
   * Scrollable panels section in sidebar
   */
  scrollablePanels: {
    flex: 1,
    padding: '0px 8px 8px 8px',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    backgroundColor: '#fff'
  } as React.CSSProperties,

  /**
   * Fixed tools section in sidebar
   */
  toolsSection: {
    padding: '4px 8px 4px 8px',
    backgroundColor: '#fff'
  } as React.CSSProperties,

  /**
   * Grid layout for plugin buttons
   */
  pluginGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '2px'
  } as React.CSSProperties
};

/**
 * Component for consistent panel headers
 */
interface PanelHeaderProps {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({ icon, title, children }) => (
  <div style={PANEL_STYLES.header}>
    <div style={PANEL_STYLES.icon}>{icon}</div>
    <span style={PANEL_STYLES.title}>{title}</span>
    {children}
  </div>
);

/**
 * Base panel wrapper with consistent styling
 */
interface BasePanelProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export const BasePanel: React.FC<BasePanelProps> = ({ children, style = {}, className }) => (
  <div className={className} style={{ ...PANEL_STYLES.panel, ...style }}>
    {children}
  </div>
);

/**
 * Panel with header component - most common pattern
 */
interface PanelWithHeaderProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  style?: React.CSSProperties;
}

export const PanelWithHeader: React.FC<PanelWithHeaderProps> = ({ 
  icon, 
  title, 
  children, 
  headerActions,
  style = {} 
}) => (
  <BasePanel style={style}>
    <PanelHeader icon={icon} title={title}>
      {headerActions}
    </PanelHeader>
    {children}
  </BasePanel>
);