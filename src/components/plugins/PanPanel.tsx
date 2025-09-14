import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Move, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export const PanPanel: React.FC = () => {
  const { pan, resetPan } = useCanvasStore();
  const panAmount = 50; // pixels to pan

  return (
    <div style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <Move size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Pan</span>
        <span style={{ fontSize: '10px', color: '#666', marginLeft: '8px' }}>
          ({Math.round(useCanvasStore.getState().viewport.panX)}, {Math.round(useCanvasStore.getState().viewport.panY)})
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Pan Left */}
        <button
          onClick={() => pan(-panAmount, 0)}
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
          title="Pan Left"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Pan Up */}
        <button
          onClick={() => pan(0, -panAmount)}
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
          title="Pan Up"
        >
          <ChevronUp size={14} />
        </button>

        {/* Pan Down */}
        <button
          onClick={() => pan(0, panAmount)}
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
          title="Pan Down"
        >
          <ChevronDown size={14} />
        </button>

        {/* Pan Right */}
        <button
          onClick={() => pan(panAmount, 0)}
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
          title="Pan Right"
        >
          <ChevronRight size={14} />
        </button>

        {/* Reset button */}
        <button
          onClick={resetPan}
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
          title="Reset Pan Position"
        >
          <RotateCcw size={12} />
        </button>
      </div>
    </div>
  );
};