import React from 'react';
import { VStack, Image } from '@chakra-ui/react';
import { SidebarUtilityButton } from '../ui/SidebarUtilityButton';

/**
 * Call to Action component for documentation link
 * Displays the logo and a button to open the documentation
 */
export const DocumentationCTA: React.FC = () => {
  return (
    <VStack spacing={4} align="center">
      <Image src="/logo.svg" boxSize="60px" opacity={0.7} />
      <SidebarUtilityButton
        label="VectorNest Documentation"
        isActive={false}
        onClick={() => window.open('https://ekrsulov.github.io/ttpe/docs/', '_blank')}
        fullWidth={false}
      />
    </VStack>
  );
};