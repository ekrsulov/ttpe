import React from 'react';
import { type ButtonProps } from '@chakra-ui/react';
import { PanelStyledButton } from './PanelStyledButton';

/**
 * Standardized button for path and subpath operations
 * Wrapper around PanelStyledButton for backwards compatibility
 * @deprecated Use PanelStyledButton directly instead
 */
export const OperationButton: React.FC<ButtonProps> = (props) => {
  return <PanelStyledButton {...props} />;
};
