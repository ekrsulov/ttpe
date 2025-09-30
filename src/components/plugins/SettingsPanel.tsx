import React, { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { logger } from '../../utils';
import { PanelWithHeader } from '../ui/PanelComponents';
import { TextInput, Button } from '../ui/FormComponents';

export const SettingsPanel: React.FC = () => {
  const { documentName, setDocumentName } = useCanvasStore();
  const [localDocumentName, setLocalDocumentName] = useState(documentName);

  // Sync local state with store
  useEffect(() => {
    setLocalDocumentName(documentName);
  }, [documentName]);

  const handleSaveSettings = () => {
    setDocumentName(localDocumentName);
    // TODO: Implement additional settings save functionality
    logger.debug('Settings saved', { documentName: localDocumentName });
  };

  return (
    <PanelWithHeader icon={<Settings size={16} />} title="Settings">
      <div style={{ display: 'grid', gap: '6px' }}>
        <TextInput
          label="Document Name"
          value={localDocumentName}
          onChange={setLocalDocumentName}
          placeholder="Enter document name"
        />

        <Button
          onClick={handleSaveSettings}
          variant="secondary"
          icon={<Save size={14} />}
          title="Save Settings"
          style={{ width: '100%' }}
        >
          Save Settings
        </Button>
      </div>
    </PanelWithHeader>
  );
};