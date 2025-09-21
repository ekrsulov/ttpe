import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { VectorSquare } from 'lucide-react';

export const TransformationPanel: React.FC = () => {
  const { 
    selectedIds, 
    selectedSubpaths, 
    transformation, 
    updateTransformationState,
    isWorkingWithSubpaths
  } = useCanvasStore();
  const { showCoordinates, showRulers } = transformation;

  const isSubpathMode = isWorkingWithSubpaths();
  const hasSelection = isSubpathMode ? selectedSubpaths.length > 0 : selectedIds.length > 0;
  const selectionText = isSubpathMode ? 'subpath' : 'element';
  const selectionCount = isSubpathMode ? selectedSubpaths.length : selectedIds.length;

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <VectorSquare size={16} style={{ marginRight: '6px', color: '#666' }} />
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Transform</span>
          {isSubpathMode && (
            <span style={{ fontSize: '10px', color: '#8b5cf6', marginLeft: '4px', backgroundColor: '#f3f4f6', padding: '1px 4px', borderRadius: '3px' }}>
              Subpath
            </span>
          )}
        </div>
      </div>

      {!hasSelection ? (
        <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Select {isSubpathMode ? 'a subpath' : 'an element'} to transform
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Selection info */}
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>
            {selectionCount} {selectionText}{selectionCount !== 1 ? 's' : ''} selected
          </div>

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