import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { TextData } from '../../types';
import { MousePointer, Pen, Type } from 'lucide-react';

export const SelectPanel: React.FC = () => {
  const { elements, selectedIds } = useCanvasStore();

  const selectedElements = elements.filter(el => (selectedIds as any).includes(el.id));

  return (
    <div style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <MousePointer size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Select</span>
        <span style={{ fontSize: '10px', color: '#007bff', marginLeft: '6px' }}>
          ({selectedElements.length})
        </span>
      </div>

      {selectedElements.length > 0 ? (
        <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
          {selectedElements.map(el => (
            <div key={el.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px',
              marginBottom: '2px',
              backgroundColor: '#f8f9fa',
              borderRadius: '3px',
              fontSize: '11px'
            }}>
              {el.type === 'path' ? <Pen size={12} /> : <Type size={12} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500' }}>{el.type} (z: {el.zIndex})</div>
                {el.type === 'path' && (
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    SVG path
                  </div>
                )}
                {el.type === 'text' && (
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    "{(el.data as TextData).text.substring(0, 20)}{(el.data as TextData).text.length > 20 ? '...' : ''}"
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', padding: '8px' }}>
          No elements selected
        </div>
      )}
    </div>
  );
};