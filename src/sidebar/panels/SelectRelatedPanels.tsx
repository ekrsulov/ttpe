import React from 'react';
import { VStack, Divider, Box } from '@chakra-ui/react';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { usePluginPanels } from '../../hooks/usePluginPanels';
import { DEFAULT_MODE } from '../../constants';

export const SelectRelatedPanels: React.FC = () => {
  // Get panels contributed to the default mode (select tool)
  const contributedPanels = usePluginPanels(DEFAULT_MODE);

  if (!contributedPanels.length) return null;

  return (
    <Box position="relative">
      <RenderCountBadgeWrapper componentName="SelectPanelRelated" position="top-left" />
      <VStack spacing={0} align="stretch">
        {contributedPanels.map((panel, index) => (
          <React.Fragment key={panel.id}>
            {index > 0 && <Divider my={2} />}
            <panel.component />
          </React.Fragment>
        ))}
      </VStack>
    </Box>
  );
};