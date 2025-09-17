import React, { useState, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Settings
} from 'lucide-react';

// Custom hook to subscribe to temporal state changes
const useTemporalState = () => {
  const [temporalState, setTemporalState] = useState(() => useCanvasStore.temporal.getState());

  useEffect(() => {
    const unsubscribe = useCanvasStore.temporal.subscribe(setTemporalState);
    return unsubscribe;
  }, []);

  return temporalState;
};

export const EditorPanel: React.FC = () => {
  const {
    selectedIds,
    deleteSelectedElements,
    zoom,
    resetZoom
  } = useCanvasStore();

  const { undo, redo, pastStates, futureStates } = useTemporalState();
  
  // Computed values
  const selectedCount = selectedIds.length;
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;
  const zoomFactor = 1.2;

  return (
    <div style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Settings size={16} style={{ marginRight: '6px', color: '#666' }} />
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Editor</span>
          <div style={{
            fontSize: '9px',
            color: '#666',
            marginLeft: '8px',
            padding: '1px 4px',
            border: '1px solid #ccc',
            borderRadius: '8px'
          }}>
            {pastStates.length}/{futureStates.length}
          </div>
        </div>
        {selectedCount > 0 && (
          <span style={{
            fontSize: '10px',
            color: '#666',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '12px',
            padding: '2px 6px',
            fontWeight: '500'
          }}>
            Selected: {selectedCount}
          </span>
        )}
      </div>

      {/* Main toolbar with essential buttons */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '12px', justifyContent: 'center' }}>
        <button
          onClick={() => undo()}
          disabled={!canUndo}
          style={{
            padding: '6px',
            backgroundColor: canUndo ? '#007bff' : '#f8f9fa',
            color: canUndo ? '#fff' : '#6c757d',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: canUndo ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            minWidth: '32px',
            minHeight: '32px'
          }}
          title="Undo"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={() => redo()}
          disabled={!canRedo}
          style={{
            padding: '6px',
            backgroundColor: canRedo ? '#007bff' : '#f8f9fa',
            color: canRedo ? '#fff' : '#6c757d',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: canRedo ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            minWidth: '32px',
            minHeight: '32px'
          }}
          title="Redo"
        >
          <Redo2 size={14} />
        </button>
        <button
          onClick={() => zoom(1 / zoomFactor, window.innerWidth / 2, window.innerHeight / 2)}
          style={{
            padding: '6px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            minWidth: '32px',
            minHeight: '32px'
          }}
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
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
            justifyContent: 'center',
            fontSize: '12px',
            minWidth: '32px',
            minHeight: '32px'
          }}
          title="Reset Zoom"
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={() => zoom(zoomFactor, window.innerWidth / 2, window.innerHeight / 2)}
          style={{
            padding: '6px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            minWidth: '32px',
            minHeight: '32px'
          }}
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onPointerUp={deleteSelectedElements}
          disabled={selectedIds.length === 0}
          style={{
            padding: '6px',
            backgroundColor: selectedIds.length > 0 ? '#dc3545' : '#f8f9fa',
            color: selectedIds.length > 0 ? '#fff' : '#6c757d',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            minWidth: '32px',
            minHeight: '32px'
          }}
          title="Delete Selected"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
