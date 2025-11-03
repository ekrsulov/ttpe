import React from 'react';
import { Panel } from '../../ui/Panel';
import { DocumentationCTA } from '../../ui/DocumentationCTA';
import { Divider } from '@chakra-ui/react';

export const DocumentationPanel: React.FC = () => {
  return (
    <Panel>
      <Divider mb={2} />
      <DocumentationCTA />
    </Panel>
  );
};