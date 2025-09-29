import React, { useState } from 'react';
import { File, Save, FolderOpen, Download } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

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
      console.error('Failed to load document:', error);
      alert('Failed to load document. Please check the file format.');
    }
  };

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
        <File size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '800', color: '#333' }}>File</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
        <button
          onClick={handleSave}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            backgroundColor: '#f8f9fa',
            color: '#333',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            flex: 1,
            minWidth: 0
          }}
          title="Save"
        >
          <Save size={14} style={{ marginRight: '4px' }} />
          Save
        </button>

        <button
          onClick={handleSaveAsSvg}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            backgroundColor: '#f8f9fa',
            color: '#333',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            flex: 1,
            minWidth: 0
          }}
          title="Save as SVG"
        >
          <Download size={14} style={{ marginRight: '4px' }} />
          Svg
        </button>

        <button
          onClick={handleLoad}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            backgroundColor: '#f8f9fa',
            color: '#333',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            flex: 1,
            minWidth: 0
          }}
          title="Load"
        >
          <FolderOpen size={14} style={{ marginRight: '4px' }} />
          Load
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
        <input
          type="checkbox"
          id="append-mode"
          checked={appendMode}
          onChange={(e) => setAppendMode(e.target.checked)}
          style={{ margin: 0 }}
        />
        <label
          htmlFor="append-mode"
          style={{
            fontSize: '11px',
            color: '#666',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          Append to current document
        </label>
      </div>
    </div>
  );
};