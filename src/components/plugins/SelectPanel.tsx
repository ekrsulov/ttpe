import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Pen } from 'lucide-react';

export const SelectPanel: React.FC = () => {
  const { elements, selectedIds } = useCanvasStore();

  const selectedElements = elements.filter(el => (selectedIds as any).includes(el.id));

  return (
    <div style={{ 
      backgroundColor: '#fff',
      padding: '0 8px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ 
        height: '94px', // Fixed height for ~2.5 elements (25% larger)
        overflowY: 'auto'
      }}>
        {selectedElements.length > 0 ? (
          selectedElements.map(el => (
            <div key={el.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px',
              backgroundColor: '#f8f9fa',
              borderRadius: '3px',
              fontSize: '11px'
            }}>
              {el.type === 'path' ? <Pen size={12} /> : <Pen size={12} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500' }}>{el.type} (z: {el.zIndex})</div>
                {el.type === 'path' && (
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    SVG path
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div style={{ 
            fontSize: '11px', 
            color: '#666', 
            textAlign: 'center', 
            padding: '8px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            No elements selected
          </div>
        )}
      </div>
    </div>
  );
};