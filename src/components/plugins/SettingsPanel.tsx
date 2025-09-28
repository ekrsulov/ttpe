import React, { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

export const SettingsPanel: React.FC = () => {
  const { documentName, setDocumentName, enableGuidelines, setEnableGuidelines } = useCanvasStore();
  const [localDocumentName, setLocalDocumentName] = useState(documentName);
  const [localEnableGuidelines, setLocalEnableGuidelines] = useState(enableGuidelines);

  // Sync local state with store
  useEffect(() => {
    setLocalDocumentName(documentName);
  }, [documentName]);

  useEffect(() => {
    setLocalEnableGuidelines(enableGuidelines);
  }, [enableGuidelines]);

  const handleSaveSettings = () => {
    setDocumentName(localDocumentName);
    setEnableGuidelines(localEnableGuidelines);
    // TODO: Implement additional settings save functionality
    console.log('Settings saved:', { documentName: localDocumentName, enableGuidelines: localEnableGuidelines });
  };

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <Settings size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Settings</span>
      </div>

      <div style={{ display: 'grid', gap: '6px' }}>
        {/* Document Name Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{
            fontSize: '11px',
            fontWeight: '500',
            color: '#666',
            textTransform: 'uppercase',
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

        {/* Enable Guidelines Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="enableGuidelines"
            checked={localEnableGuidelines}
            onChange={(e) => setLocalEnableGuidelines(e.target.checked)}
            style={{
              width: '14px',
              height: '14px',
              cursor: 'pointer'
            }}
          />
          <label
            htmlFor="enableGuidelines"
            style={{
              fontSize: '12px',
              color: '#333',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            Enable Guidelines & Snapping
          </label>
        </div>

        {/* Save Settings Button */}
        <button
          onClick={handleSaveSettings}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
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