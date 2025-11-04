import React from 'react';
import { VStack, Image, Text } from '@chakra-ui/react';
import { SidebarUtilityButton } from '../ui/SidebarUtilityButton';

/**
 * Call to Action component for documentation link
 * Displays the logo and a button to open the documentation
 */
export const DocumentationCTA: React.FC = () => {
  return (
    <VStack spacing={1} align="center">
      <Image src="./logo.svg" boxSize="50px" opacity={0.7} />
      <Text fontFamily="Momo Trust Display" fontSize="lg" textAlign="center">VectorNest</Text>
      <SidebarUtilityButton
        label="Documentation"
        isActive={false}
        onClick={() => window.open('https://ekrsulov.github.io/ttpe/docs/', '_blank')}
        fullWidth={false}
      />
    </VStack>
  );
};