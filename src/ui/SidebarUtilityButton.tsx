import React from 'react';
import { Button, useColorModeValue } from '@chakra-ui/react';

interface SidebarUtilityButtonProps {
  label: string;
  isActive?: boolean;
  onClick: () => void;
  fullWidth?: boolean;
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
}) => {
  const inactiveColor = useColorModeValue('gray.700', 'gray.200');
  const inactiveBorder = useColorModeValue('gray.400', 'whiteAlpha.300');
  const inactiveHoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  const activeBg = useColorModeValue('gray.800', 'gray.200');
  const activeColor = useColorModeValue('white', 'gray.900');
  const activeHoverBg = useColorModeValue('gray.800', 'gray.200');
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
        '-webkit-appearance': 'none',
        appearance: 'none',
        '-webkit-tap-highlight-color': 'transparent',
      }}
    >
      {label}
    </Button>
  );
};
