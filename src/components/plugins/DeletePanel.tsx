import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Trash2 } from 'lucide-react';

export const DeletePanel: React.FC = () => {
  const { deleteSelectedElements, selectedIds } = useCanvasStore();

  return (
    <div style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <Trash2 size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Delete</span>
      </div>

      <button
        onPointerUp={deleteSelectedElements}
        disabled={selectedIds.length === 0}
        style={{
          width: '100%',
          backgroundColor: selectedIds.length > 0 ? '#dc3545' : '#f8f9fa',
          color: selectedIds.length > 0 ? '#fff' : '#6c757d',
          border: '1px solid #dee2e6',
          padding: '6px 8px',
          borderRadius: '4px',
          cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px'
        }}
      >
        <Trash2 size={14} />
        Delete ({selectedIds.length})
      </button>
    </div>
  );
};