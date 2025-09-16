import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Move, Eye, EyeOff, Grid } from 'lucide-react';

export const TransformationPanel: React.FC = () => {
  const { selectedIds, plugins, updatePluginState } = useCanvasStore();
  const transformationPlugin = plugins.transformation || {};
  const { showCoordinates = false, showRulers = false } = transformationPlugin;

  const hasSelection = selectedIds.length > 0;

  return (
    <div style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Move size={16} style={{ marginRight: '6px', color: '#666' }} />
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Transform</span>
        </div>
        <span style={{
          fontSize: '10px',
          color: '#666',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '2px 6px',
          fontWeight: '500'
        }}>
          {hasSelection ? selectedIds.length : 0}
        </span>
      </div>

      {!hasSelection ? (
        <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', padding: '8px' }}>
          Select an element to transform
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Show Coordinates Toggle */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="showCoordinates"
              checked={showCoordinates}
              onChange={(e) => updatePluginState('transformation', { showCoordinates: e.target.checked })}
              style={{ marginRight: '6px' }}
            />
            <label htmlFor="showCoordinates" style={{ fontSize: '11px', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {showCoordinates ? <Eye size={12} style={{ marginRight: '4px' }} /> : <EyeOff size={12} style={{ marginRight: '4px' }} />}
              Coordinates
            </label>
          </div>

          {/* Show Rulers Toggle */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="showRulers"
              checked={showRulers}
              onChange={(e) => updatePluginState('transformation', { showRulers: e.target.checked })}
              style={{ marginRight: '6px' }}
            />
            <label htmlFor="showRulers" style={{ fontSize: '11px', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Grid size={12} style={{ marginRight: '4px' }} />
              Rulers
            </label>
          </div>
        </div>
      )}
    </div>
  );
};