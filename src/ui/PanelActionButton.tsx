import React from 'react';
import { IconButton as ChakraIconButton } from '@chakra-ui/react';
import type { LucideIcon } from 'lucide-react';
import ConditionalTooltip from './ConditionalTooltip';

interface PanelActionButtonProps {
  label: string;
  icon: LucideIcon;
  iconSize?: number;
  height?: string;
  onClick: () => void;
  isDisabled?: boolean;
  variant?: 'ghost' | 'solid' | 'outline' | 'link';
  tooltipDelay?: number;
}

export const PanelActionButton: React.FC<PanelActionButtonProps> = ({
  label,
  icon: Icon,
  iconSize = 12,
  height = '20px',
  onClick,
  isDisabled = false,
  variant = 'ghost',
  tooltipDelay = 200,
}) => {
  return (
    <ConditionalTooltip label={label} openDelay={tooltipDelay}>
      <ChakraIconButton
        aria-label={label}
        icon={<Icon size={iconSize} />}
        size="xs"
        variant={variant}
        minW="auto"
        h={height}
        p={1}
        onClick={onClick}
        isDisabled={isDisabled}
        border="none"
        _hover={{ bg: 'gray.50' }}
        _active={{ bg: 'gray.100' }}
      />
    </ConditionalTooltip>
  );
};