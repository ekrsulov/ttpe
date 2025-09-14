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
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        {/* Pan controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px', width: 'fit-content' }}>
          <div></div>
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
          <div></div>

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
          <div></div>
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

          <div></div>
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
          <div></div>
        </div>

        {/* Reset button */}
        <button
          onClick={resetPan}
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
            gap: '4px',
            marginTop: '4px'
          }}
          title="Reset Pan"
        >
          <RotateCcw size={12} />
          Reset
        </button>

        {/* Current position */}
        <div style={{
          fontSize: '10px',
          color: '#666',
          marginTop: '4px',
          textAlign: 'center'
        }}>
          ({Math.round(useCanvasStore.getState().viewport.panX)}, {Math.round(useCanvasStore.getState().viewport.panY)})
        </div>
      </div>
    </div>
  );
};