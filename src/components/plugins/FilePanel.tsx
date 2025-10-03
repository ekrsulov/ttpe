import React, { useState } from 'react';
import { Button as ChakraButton, Checkbox as ChakraCheckbox, HStack, VStack } from '@chakra-ui/react';
import { File, Save, FolderOpen, Download } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { logger } from '../../utils';
import { Panel } from '../ui/Panel';

export const FilePanel: React.FC = () => {
  const { saveDocument, loadDocument, saveAsSvg } = useCanvasStore();
  const [appendMode, setAppendMode] = useState(false);

  const handleSave = () => {
    saveDocument();
  };

  const handleSaveAsSvg = () => {
    saveAsSvg();
  };

  const handleLoad = async () => {
    try {
      await loadDocument(appendMode);
    } catch (error) {
      logger.error('Failed to load document', error);
      alert('Failed to load document. Please check the file format.');
    }
  };

  return (
    <Panel icon={<File size={16} />} title="File">
      <VStack spacing={2} align="stretch">
        <HStack spacing={1}>
          <ChakraButton
            onClick={handleSave}
            variant="secondary"
            leftIcon={<Save size={14} />}
            flex={1}
            size="sm"
          >
            Save
          </ChakraButton>

          <ChakraButton
            onClick={handleSaveAsSvg}
            variant="secondary"
            leftIcon={<Download size={14} />}
            flex={1}
            size="sm"
          >
            Svg
          </ChakraButton>

          <ChakraButton
            onClick={handleLoad}
            variant="secondary"
            leftIcon={<FolderOpen size={14} />}
            flex={1}
            size="sm"
          >
            Load
          </ChakraButton>
        </HStack>

        <ChakraCheckbox
          id="append-mode"
          isChecked={appendMode}
          onChange={(e) => setAppendMode(e.target.checked)}
          size="sm"
        >
          Append to current document
        </ChakraCheckbox>
      </VStack>
    </Panel>
  );
};