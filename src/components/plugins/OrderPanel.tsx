import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Layers, ChevronUp, ChevronDown, Triangle } from 'lucide-react';

export const OrderPanel: React.FC = () => {
  const { plugins, bringToFront, sendForward, sendBackward, sendToBack } = useCanvasStore();
  const selectedCount = plugins.select.selectedIds.length;

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
        <button
          onClick={bringToFront}
          disabled={selectedCount === 0}
          style={{
            padding: '6px',
            backgroundColor: selectedCount > 0 ? '#007bff' : '#f8f9fa',
            color: selectedCount > 0 ? '#fff' : '#6c757d',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
            fontSize: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px'
          }}
          title="Bring to Front"
        >
          <Triangle size={12} style={{ transform: 'rotate(180deg)' }} />
          <span>Front</span>
        </button>

        <button
          onClick={sendForward}
          disabled={selectedCount === 0}
          style={{
            padding: '6px',
            backgroundColor: selectedCount > 0 ? '#28a745' : '#f8f9fa',
            color: selectedCount > 0 ? '#fff' : '#6c757d',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
            fontSize: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px'
          }}
          title="Send Forward"
        >
          <ChevronUp size={12} />
          <span>Forward</span>
        </button>

        <button
          onClick={sendBackward}
          disabled={selectedCount === 0}
          style={{
            padding: '6px',
            backgroundColor: selectedCount > 0 ? '#ffc107' : '#f8f9fa',
            color: selectedCount > 0 ? '#000' : '#6c757d',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
            fontSize: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px'
          }}
          title="Send Backward"
        >
          <ChevronDown size={12} />
          <span>Back</span>
        </button>

        <button
          onClick={sendToBack}
          disabled={selectedCount === 0}
          style={{
            padding: '6px',
            backgroundColor: selectedCount > 0 ? '#dc3545' : '#f8f9fa',
            color: selectedCount > 0 ? '#fff' : '#6c757d',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
            fontSize: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px'
          }}
          title="Send to Back"
        >
          <Triangle size={12} />
          <span>Bottom</span>
        </button>
      </div>
    </div>
  );
};