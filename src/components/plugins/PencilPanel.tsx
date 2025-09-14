import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Pen, Palette, Eye } from 'lucide-react';

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

  const handleOpacityChange = (value: number) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ opacity: value });
    } else {
      updatePluginState('pencil', { opacity: value });
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

  const getCurrentOpacity = () => {
    if (selectedPathsCount > 0) {
      const selectedElements = useCanvasStore.getState().getSelectedElements();
      const pathElements = selectedElements.filter(el => el.type === 'path');
      if (pathElements.length > 0) {
        // Return the opacity of the first selected path
        return (pathElements[0].data as any).opacity;
      }
    }
    return plugins.pencil.opacity;
  };

  return (
    <div style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <Pen size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Pencil</span>
        {selectedPathsCount > 0 && (
          <span style={{ fontSize: '10px', color: '#007bff', marginLeft: '6px' }}>
            ({selectedPathsCount})
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
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
          style={{
            width: '50px',
            padding: '4px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            fontSize: '12px'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <Palette size={14} style={{ color: '#666' }} />
          <input
            type="color"
            value={getCurrentStrokeColor()}
            onChange={(e) => handleStrokeColorChange(e.target.value)}
            style={{
              width: '24px',
              height: '24px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <Eye size={14} style={{ color: '#666' }} />
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={getCurrentOpacity()}
          onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
          style={{
            width: '60px',
            height: '4px',
            borderRadius: '2px',
            background: '#ddd',
            outline: 'none',
            cursor: 'pointer'
          }}
        />
        <span style={{ fontSize: '10px', color: '#666', minWidth: '20px' }}>
          {Math.round(getCurrentOpacity() * 100)}%
        </span>
      </div>
    </div>
  );
};