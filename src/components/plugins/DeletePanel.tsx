import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';

export const DeletePanel: React.FC = () => {
  const { plugins, deleteSelectedElements } = useCanvasStore();

  return (
    <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <h4>Delete</h4>
      <button
        onClick={deleteSelectedElements}
        disabled={plugins.select.selectedIds.length === 0}
        style={{
          backgroundColor: plugins.select.selectedIds.length > 0 ? '#dc3545' : '#ccc',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '4px',
          cursor: plugins.select.selectedIds.length > 0 ? 'pointer' : 'not-allowed'
        }}
      >
        Delete Selected ({plugins.select.selectedIds.length})
      </button>
    </div>
  );
};