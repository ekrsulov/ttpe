import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';

export const OrderPanel: React.FC = () => {
  const { plugins, bringToFront, sendForward, sendBackward, sendToBack } = useCanvasStore();
  const selectedCount = plugins.select.selectedIds.length;

  return (
    <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <h4>Order</h4>
      <p>Selected: {selectedCount} element(s)</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
        <button
          onClick={bringToFront}
          disabled={selectedCount === 0}
          style={{
            padding: '8px',
            backgroundColor: selectedCount > 0 ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
            fontSize: '12px'
          }}
        >
          Bring to Front
        </button>
        <button
          onClick={sendForward}
          disabled={selectedCount === 0}
          style={{
            padding: '8px',
            backgroundColor: selectedCount > 0 ? '#28a745' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
            fontSize: '12px'
          }}
        >
          Send Forward
        </button>
        <button
          onClick={sendBackward}
          disabled={selectedCount === 0}
          style={{
            padding: '8px',
            backgroundColor: selectedCount > 0 ? '#ffc107' : '#ccc',
            color: 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
            fontSize: '12px'
          }}
        >
          Send Backward
        </button>
        <button
          onClick={sendToBack}
          disabled={selectedCount === 0}
          style={{
            padding: '8px',
            backgroundColor: selectedCount > 0 ? '#dc3545' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
            fontSize: '12px'
          }}
        >
          Send to Back
        </button>
      </div>
    </div>
  );
};