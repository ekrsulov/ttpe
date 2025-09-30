import React, { useState } from 'react';
import { File, Save, FolderOpen, Download } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { logger } from '../../utils';
import { PanelWithHeader } from '../ui/PanelComponents';
import { Button, Checkbox } from '../ui/FormComponents';

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
    <PanelWithHeader icon={<File size={16} />} title="File">
      <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
        <Button
          onClick={handleSave}
          variant="secondary"
          icon={<Save size={14} />}
          title="Save"
          style={{ flex: 1, minWidth: 0 }}
        >
          Save
        </Button>

        <Button
          onClick={handleSaveAsSvg}
          variant="secondary"
          icon={<Download size={14} />}
          title="Save as SVG"
          style={{ flex: 1, minWidth: 0 }}
        >
          Svg
        </Button>

        <Button
          onClick={handleLoad}
          variant="secondary"
          icon={<FolderOpen size={14} />}
          title="Load"
          style={{ flex: 1, minWidth: 0 }}
        >
          Load
        </Button>
      </div>

      <div style={{ marginTop: '8px' }}>
        <Checkbox
          id="append-mode"
          checked={appendMode}
          onChange={setAppendMode}
          label="Append to current document"
        />
      </div>
    </PanelWithHeader>
  );
};