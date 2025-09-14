import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Layers, ChevronUp, ChevronDown, Triangle } from 'lucide-react';

export const OrderPanel: React.FC = () => {
  const { selectedIds, bringToFront, sendForward, sendBackward, sendToBack } = useCanvasStore();
  const selectedCount = selectedIds.length;

  return (
    <div style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <Layers size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Order</span>
        {selectedCount > 0 && (
          <span style={{ fontSize: '10px', color: '#007bff', marginLeft: '6px' }}>
            ({selectedCount})
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '2px' }}>
        <button
          onClick={bringToFront}
          disabled={selectedCount === 0}
          style={{
            padding: '6px',
            backgroundColor: selectedCount > 0 ? '#f8f9fa' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Bring to Front"
        >
          <Triangle size={12} />
        </button>

        <button
          onClick={sendForward}
          disabled={selectedCount === 0}
          style={{
            padding: '6px',
            backgroundColor: selectedCount > 0 ? '#f8f9fa' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Send Forward"
        >
          <ChevronUp size={12} />
        </button>

        <button
          onClick={sendBackward}
          disabled={selectedCount === 0}
          style={{
            padding: '6px',
            backgroundColor: selectedCount > 0 ? '#f8f9fa' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Send Backward"
        >
          <ChevronDown size={12} />
        </button>

        <button
          onClick={sendToBack}
          disabled={selectedCount === 0}
          style={{
            padding: '6px',
            backgroundColor: selectedCount > 0 ? '#f8f9fa' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Send to Back"
        >
          <Triangle size={12} style={{ transform: 'rotate(180deg)' }} />
        </button>
      </div>
    </div>
  );
};