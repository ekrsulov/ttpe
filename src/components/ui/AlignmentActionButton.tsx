import React from 'react';
import { Button } from '@chakra-ui/react';
import type { ButtonProps } from '@chakra-ui/react';

// Internal interface - only used within this component
interface AlignmentActionButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {
  children: React.ReactNode;
}

/**
 * Reusable button component for alignment panel actions
 * Provides consistent styling across all alignment buttons
 */
export const AlignmentActionButton: React.FC<AlignmentActionButtonProps> = ({
  children,
  ...props
}) => {
  return (
    <Button
      variant="unstyled"
      size="sm"
      bg="transparent"
      color="gray.700"
      border="1px solid"
      borderColor="gray.400"
      borderRadius="md"
      fontWeight="medium"
      fontSize="10px"
      transition="all 0.2s"
      _hover={{
        bg: 'gray.50'
      }}
      sx={{
        minH: '28px',
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      {...props}
    >
      {children}
    </Button>
  );
};
