import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';

export const ZoomPanel: React.FC = () => {
  const { zoom, resetZoom } = useCanvasStore();

  const zoomFactor = 1.2;

  return (
    <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <h4>Zoom</h4>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={() => zoom(1 / zoomFactor)} style={{ marginRight: '10px' }}>Zoom Out</button>
        <button onClick={() => zoom(zoomFactor)}>Zoom In</button>
      </div>
      <div>
        <button 
          onClick={resetZoom}
          style={{
            padding: '5px 10px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Reset Zoom
        </button>
      </div>
      <p>Zoom: {Math.round(useCanvasStore.getState().viewport.zoom * 100)}%</p>
    </div>
  );
};