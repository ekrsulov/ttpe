import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export const ZoomPanel: React.FC = () => {
  const { zoom, resetZoom } = useCanvasStore();
  const zoomFactor = 1.2;

  return (
    <div style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <ZoomIn size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Zoom</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        {/* Zoom controls */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => zoom(1 / zoomFactor)}
            style={{
              padding: '6px 8px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px'
            }}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
            Out
          </button>
          <button
            onClick={() => zoom(zoomFactor)}
            style={{
              padding: '6px 8px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px'
            }}
            title="Zoom In"
          >
            <ZoomIn size={14} />
            In
          </button>
        </div>

        {/* Reset button */}
        <button
          onClick={resetZoom}
          style={{
            padding: '4px 8px',
            backgroundColor: '#dc3545',
            color: '#fff',
            border: '1px solid #dc3545',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Reset Zoom"
        >
          <RotateCcw size={12} />
          Reset
        </button>

        {/* Current zoom level */}
        <div style={{
          fontSize: '10px',
          color: '#666',
          textAlign: 'center'
        }}>
          {Math.round(useCanvasStore.getState().viewport.zoom * 100)}%
        </div>
      </div>
    </div>
  );
};