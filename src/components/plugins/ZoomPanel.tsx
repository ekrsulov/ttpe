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
        <span style={{ fontSize: '10px', color: '#666', marginLeft: '8px' }}>
          {Math.round(useCanvasStore.getState().viewport.zoom * 100)}%
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Zoom controls */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            onClick={() => zoom(1 / zoomFactor)}
            style={{
              padding: '6px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Zoom Out (20%)"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => zoom(zoomFactor)}
            style={{
              padding: '6px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Zoom In (20%)"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        {/* Reset button */}
        <button
          onClick={resetZoom}
          style={{
            padding: '6px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Reset Zoom (100%)"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};