import React from 'react';
import { Button } from '@chakra-ui/react';
import { useThemeColors } from '../hooks';

interface SidebarUtilityButtonProps {
  label: string;
  isActive?: boolean;
  onClick: () => void;
  fullWidth?: boolean;
  /** Flex grow value for distributing space (e.g., 1 for equal, 2 for double) */
  flex?: number;
}

/**
 * Styled button component for sidebar utility actions (File, Settings, Pin)
 * Extracted from SidebarToolGrid to eliminate duplicate button styling
 */
export const SidebarUtilityButton: React.FC<SidebarUtilityButtonProps> = ({
  label,
  isActive = false,
  onClick,
  fullWidth = false,
  flex,
}) => {
  const { toggle: { inactive: { color: inactiveColor, border: inactiveBorder, hoverBg: inactiveHoverBg }, active: { bg: activeBg, color: activeColor, hoverBg: activeHoverBg } } } = useThemeColors();
  return (
    <Button
      aria-label={label}
      onClick={onClick}
      variant="unstyled"
      size="xs"
      fontSize="sm"
      data-active={isActive}
      bg={isActive ? activeBg : 'transparent'}
      color={isActive ? activeColor : inactiveColor}
      border="1px solid"
      borderColor={isActive ? activeBg : inactiveBorder}
      borderRadius="full"
      fontWeight="bold"
      transition="all 0.2s"
      width={fullWidth ? 'full' : 'auto'}
      flex={flex}
      _hover={{
        bg: isActive ? activeHoverBg : inactiveHoverBg,
      }}
      _focus={{ outline: 'none', boxShadow: 'none' }}
      sx={{
        minH: '28px',
        px: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        WebkitAppearance: 'none',
        appearance: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {label}
    </Button>
  );
};
