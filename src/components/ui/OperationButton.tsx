import React from 'react';
import { Button, type ButtonProps } from '@chakra-ui/react';

/**
 * Standardized button for path and subpath operations
 * Provides consistent styling across operation panels
 */
export const OperationButton: React.FC<ButtonProps> = (props) => {
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
    />
  );
};
