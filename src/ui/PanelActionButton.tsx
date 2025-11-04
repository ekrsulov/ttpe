import React from 'react';
import { IconButton as ChakraIconButton, useColorModeValue } from '@chakra-ui/react';
import type { LucideIcon } from 'lucide-react';
import ConditionalTooltip from './ConditionalTooltip';

interface PanelActionButtonProps {
  label: string;
  icon: LucideIcon;
  iconSize?: number;
  height?: string;
  onClick: (e?: React.MouseEvent) => void;
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
  const hoverBg = useColorModeValue('gray.300', 'whiteAlpha.400');
  const activeBg = useColorModeValue('gray.400', 'whiteAlpha.500');
  const iconColor = useColorModeValue('gray.600', 'gray.200');
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
        borderRadius="full"
        onClick={onClick}
        isDisabled={isDisabled}
        border="none"
        color={iconColor}
        _hover={{ bg: hoverBg }}
        _active={{ bg: activeBg }}
      />
    </ConditionalTooltip>
  );
};