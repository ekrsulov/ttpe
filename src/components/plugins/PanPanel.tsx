import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';

export const PanPanel: React.FC = () => {
  const { pan, resetPan } = useCanvasStore();

  const panAmount = 50; // pixels to pan

  return (
    <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <h4>Pan</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', width: 'fit-content' }}>
        <div></div>
        <button onClick={() => pan(0, -panAmount)}>↑</button>
        <div></div>
        <button onClick={() => pan(-panAmount, 0)}>←</button>
        <div></div>
        <button onClick={() => pan(panAmount, 0)}>→</button>
        <div></div>
        <button onClick={() => pan(0, panAmount)}>↓</button>
        <div></div>
      </div>
      <div style={{ marginTop: '10px' }}>
        <button 
          onClick={resetPan}
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
          Reset Pan
        </button>
      </div>
      <p>Pan: ({Math.round(useCanvasStore.getState().viewport.panX)}, {Math.round(useCanvasStore.getState().viewport.panY)})</p>
    </div>
  );
};