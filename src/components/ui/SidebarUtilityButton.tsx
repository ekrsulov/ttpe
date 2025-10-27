import React from 'react';
import { Button } from '@chakra-ui/react';

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
  return (
    <Button
      aria-label={label}
      onClick={onClick}
      variant="unstyled"
      size="sm"
      data-active={isActive}
      bg={isActive ? 'blue.500' : 'transparent'}
      color={isActive ? 'white' : 'gray.700'}
      border="1px solid"
      borderColor={isActive ? 'blue.500' : 'gray.400'}
      borderRadius="md"
      fontWeight="medium"
      transition="all 0.2s"
      width={fullWidth ? 'full' : 'auto'}
      _hover={{
        bg: isActive ? 'blue.600' : 'gray.50',
      }}
      sx={{
        minH: '32px',
        px: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {label}
    </Button>
  );
};
