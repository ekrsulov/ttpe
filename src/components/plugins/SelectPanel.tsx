import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { PathData, TextData } from '../../types';

export const SelectPanel: React.FC = () => {
  const { plugins, elements } = useCanvasStore();

  const selectedElements = elements.filter(el => plugins.select.selectedIds.includes(el.id));

  return (
    <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <h4>Select</h4>
      <p>Selected: {selectedElements.length} element(s)</p>
      {selectedElements.map(el => (
        <div key={el.id} style={{ marginBottom: '5px', fontSize: '12px' }}>
          <strong>{el.type}</strong> - ID: {el.id}
          {el.type === 'path' && (
            <div>Points: {(el.data as PathData).points.length}</div>
          )}
          {el.type === 'text' && (
            <div>Text: "{(el.data as TextData).text}"</div>
          )}
        </div>
      ))}
    </div>
  );
};