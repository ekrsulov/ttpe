import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { MousePointer, Pen } from 'lucide-react';

export const SelectPanel: React.FC = () => {
  const { elements, selectedIds } = useCanvasStore();

  const selectedElements = elements.filter(el => (selectedIds as any).includes(el.id));

  return (
    <div style={{ 
      padding: '8px', 
      border: '1px solid #ddd', 
      borderRadius: '4px', 
      backgroundColor: '#fff',
      height: '120px', // Fixed height for ~2.5 elements
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <MousePointer size={16} style={{ marginRight: '6px', color: '#666' }} />
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Select</span>
        </div>
        <span style={{
          fontSize: '10px',
          color: '#666',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '2px 6px',
          fontWeight: '500'
        }}>
          {selectedElements.length}
        </span>
      </div>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        minHeight: 0 // Allow flexbox to shrink this area
      }}>
        {selectedElements.length > 0 ? (
          selectedElements.map(el => (
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
            padding: '16px 8px',
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