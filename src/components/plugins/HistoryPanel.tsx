import React, { useState, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Undo2, Redo2 } from 'lucide-react';

// Custom hook to subscribe to temporal state changes
const useTemporalState = () => {
  const [temporalState, setTemporalState] = useState(() => useCanvasStore.temporal.getState());

  useEffect(() => {
    const unsubscribe = useCanvasStore.temporal.subscribe(setTemporalState);
    return unsubscribe;
  }, []);

  return temporalState;
};

export const HistoryPanel: React.FC = () => {
  const { undo, redo, pastStates, futureStates } = useTemporalState();

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  return (
    <div style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <Undo2 size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>History</span>
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => undo()}
          disabled={!canUndo}
          style={{
            padding: '6px 8px',
            border: '1px solid #ddd',
            borderRadius: '3px',
            backgroundColor: canUndo ? '#007bff' : '#f8f9fa',
            color: canUndo ? '#fff' : '#6c757d',
            cursor: canUndo ? 'pointer' : 'not-allowed',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flex: 1,
            justifyContent: 'center'
          }}
          title="Undo"
        >
          <Undo2 size={14} />
          Undo
        </button>

        <button
          onClick={() => redo()}
          disabled={!canRedo}
          style={{
            padding: '6px 8px',
            border: '1px solid #ddd',
            borderRadius: '3px',
            backgroundColor: canRedo ? '#007bff' : '#f8f9fa',
            color: canRedo ? '#fff' : '#6c757d',
            cursor: canRedo ? 'pointer' : 'not-allowed',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flex: 1,
            justifyContent: 'center'
          }}
          title="Redo"
        >
          <Redo2 size={14} />
          Redo
        </button>
      </div>

      <div style={{ marginTop: '8px', fontSize: '10px', color: '#666', textAlign: 'center' }}>
        Past: {pastStates.length} | Future: {futureStates.length}
      </div>
    </div>
  );
};