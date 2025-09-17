import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { VectorSquare } from 'lucide-react';

export const TransformationPanel: React.FC = () => {
  const { selectedIds, transformation, updateTransformationState } = useCanvasStore();
  const { showCoordinates, showRulers } = transformation;

  const hasSelection = selectedIds.length > 0;

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <VectorSquare size={16} style={{ marginRight: '6px', color: '#666' }} />
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Transform</span>
        </div>
      </div>

      {!hasSelection ? (
        <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Select an element to transform
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Show Coordinates Toggle */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="showCoordinates"
              checked={showCoordinates}
              onChange={(e) => updateTransformationState({ showCoordinates: e.target.checked })}
              style={{ marginRight: '6px' }}
            />
            <label htmlFor="showCoordinates" style={{ fontSize: '11px', color: '#666', cursor: 'pointer' }}>
              Coordinates
            </label>
          </div>

          {/* Show Rulers Toggle */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="showRulers"
              checked={showRulers}
              onChange={(e) => updateTransformationState({ showRulers: e.target.checked })}
              style={{ marginRight: '6px' }}
            />
            <label htmlFor="showRulers" style={{ fontSize: '11px', color: '#666', cursor: 'pointer' }}>
              Rulers
            </label>
          </div>
        </div>
      )}
    </div>
  );
};