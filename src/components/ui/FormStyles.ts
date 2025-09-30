import React from 'react';

/**
 * Common form input styles used across panels
 */
export const INPUT_STYLES = {
  textInput: {
    padding: '6px 8px',
    border: '1px solid #ccc',
    borderRadius: '3px',
    fontSize: '12px',
    color: '#333',
    backgroundColor: '#fff'
  } as React.CSSProperties,

  label: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#666',
    letterSpacing: '0.5px'
  } as React.CSSProperties,

  checkbox: {
    marginRight: '8px'
  } as React.CSSProperties,

  checkboxLabel: {
    fontSize: '11px',
    color: '#666',
    cursor: 'pointer',
    userSelect: 'none'
  } as React.CSSProperties,

  select: {
    padding: '4px 6px',
    border: '1px solid #ccc',
    borderRadius: '3px',
    fontSize: '11px',
    color: '#333',
    backgroundColor: '#fff'
  } as React.CSSProperties
};

/**
 * Button styles used across panels
 */
export const BUTTON_STYLES = {
  primary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 12px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  } as React.CSSProperties,

  secondary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 12px',
    backgroundColor: '#f8f9fa',
    color: '#333',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  } as React.CSSProperties,

  small: {
    padding: '4px 8px',
    fontSize: '10px',
    borderRadius: '3px'
  } as React.CSSProperties
};

/**
 * Text styles used in panels
 */
export const TEXT_STYLES = {
  sectionLabel: {
    fontSize: '10px',
    color: '#666',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  } as React.CSSProperties,

  helpText: {
    fontSize: '11px',
    color: '#666',
    textAlign: 'center' as const
  } as React.CSSProperties,

  infoText: {
    fontSize: '10px',
    color: '#666'
  } as React.CSSProperties,

  badge: {
    fontSize: '10px',
    color: '#8b5cf6',
    marginLeft: '4px',
    backgroundColor: '#f3f4f6',
    padding: '1px 4px',
    borderRadius: '3px'
  } as React.CSSProperties
};

/**
 * Layout styles for common arrangements
 */
export const LAYOUT_STYLES = {
  flexRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  } as React.CSSProperties,

  flexColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px'
  } as React.CSSProperties,

  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  } as React.CSSProperties,

  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px'
  } as React.CSSProperties,

  fullWidth: {
    width: '100%'
  } as React.CSSProperties
};