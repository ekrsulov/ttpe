import React, { useState } from 'react';
import { File, Save, FolderOpen } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

export const FilePanel: React.FC = () => {
  const { saveDocument, loadDocument } = useCanvasStore();
  const [appendMode, setAppendMode] = useState(false);

  const handleSave = () => {
    saveDocument();
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
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <File size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>File</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button
          onClick={handleSave}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            width: '100%',
            justifyContent: 'flex-start'
          }}
          title="Save"
        >
          <Save size={14} style={{ marginRight: '8px' }} />
          Save
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

        <button
          onClick={handleLoad}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            width: '100%',
            justifyContent: 'flex-start'
          }}
          title="Load"
        >
          <FolderOpen size={14} style={{ marginRight: '8px' }} />
          Load
        </button>
      </div>
    </div>
  );
};