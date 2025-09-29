import React, { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

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
    console.log('Settings saved:', { documentName: localDocumentName });
  };

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
        <Settings size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '800', color: '#333' }}>Settings</span>
      </div>

      <div style={{ display: 'grid', gap: '6px' }}>
        {/* Document Name Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{
            fontSize: '11px',
            fontWeight: '500',
            color: '#666',
            letterSpacing: '0.5px'
          }}>
            Document Name
          </label>
          <input
            type="text"
            value={localDocumentName}
            onChange={(e) => setLocalDocumentName(e.target.value)}
            placeholder="Enter document name"
            style={{
              padding: '6px 8px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '12px',
              color: '#333',
              backgroundColor: '#fff',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007bff'}
            onBlur={(e) => e.target.style.borderColor = '#ccc'}
          />
        </div>

        {/* Save Settings Button */}
        <button
          onClick={handleSaveSettings}
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
            width: '100%',
            gap: '6px'
          }}
          title="Save Settings"
        >
          <Save size={14} />
          Save Settings
        </button>
      </div>
    </div>
  );
};