import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';

export const PencilPanel: React.FC = () => {
  const { plugins, updatePluginState, getSelectedPathsCount, updateSelectedPaths } = useCanvasStore();
  const selectedPathsCount = getSelectedPathsCount();

  const handleStrokeWidthChange = (value: number) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeWidth: value });
    } else {
      updatePluginState('pencil', { strokeWidth: value });
    }
  };

  const handleStrokeColorChange = (value: string) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeColor: value });
    } else {
      updatePluginState('pencil', { strokeColor: value });
    }
  };

  // Get current values from selected elements or plugin defaults
  const getCurrentStrokeWidth = () => {
    if (selectedPathsCount > 0) {
      const selectedElements = useCanvasStore.getState().getSelectedElements();
      const pathElements = selectedElements.filter(el => el.type === 'path');
      if (pathElements.length > 0) {
        // Return the stroke width of the first selected path
        return (pathElements[0].data as any).strokeWidth;
      }
    }
    return plugins.pencil.strokeWidth;
  };

  const getCurrentStrokeColor = () => {
    if (selectedPathsCount > 0) {
      const selectedElements = useCanvasStore.getState().getSelectedElements();
      const pathElements = selectedElements.filter(el => el.type === 'path');
      if (pathElements.length > 0) {
        // Return the stroke color of the first selected path
        return (pathElements[0].data as any).strokeColor;
      }
    }
    return plugins.pencil.strokeColor;
  };

  return (
    <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <h4>Pencil</h4>
      {selectedPathsCount > 0 && (
        <p style={{ fontSize: '12px', color: '#007bff', marginBottom: '10px' }}>
          Editing {selectedPathsCount} selected path{selectedPathsCount > 1 ? 's' : ''}
        </p>
      )}
      <div style={{ marginBottom: '10px' }}>
        <label>Stroke Width: </label>
        <input
          type="number"
          value={getCurrentStrokeWidth()}
          onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value) || 1)}
          onKeyDown={(e) => {
            if (e.code === 'Space') {
              e.stopPropagation();
            }
          }}
          min="1"
          max="20"
        />
      </div>
      <div>
        <label>Stroke Color: </label>
        <input
          type="color"
          value={getCurrentStrokeColor()}
          onChange={(e) => handleStrokeColorChange(e.target.value)}
        />
      </div>
    </div>
  );
};