import React from 'react';
import type { ButtonProps } from '@chakra-ui/react';
import { PanelStyledButton } from './PanelStyledButton';

/**
 * Reusable button component for alignment panel actions
 * Wrapper around PanelStyledButton for backwards compatibility
 * @deprecated Use PanelStyledButton directly instead
 */
export const AlignmentActionButton: React.FC<ButtonProps> = (props) => {
  return <PanelStyledButton {...props} />;
};
