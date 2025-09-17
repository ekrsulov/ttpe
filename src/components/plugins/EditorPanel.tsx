import React, { useState, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Pen,
  Eye,
  Circle,
  PaintBucket,
  X
} from 'lucide-react';
import { IconButton } from '../ui/IconButton';

// Custom hook to subscribe to temporal state changes
const useTemporalState = () => {
  const [temporalState, setTemporalState] = useState(() => useCanvasStore.temporal.getState());

  useEffect(() => {
    const unsubscribe = useCanvasStore.temporal.subscribe(setTemporalState);
    return unsubscribe;
  }, []);

  return temporalState;
};

export const EditorPanel: React.FC = () => {
  const {
    selectedIds,
    deleteSelectedElements,
    viewport,
    zoom,
    resetZoom,
    plugins,
    updatePluginState,
    getSelectedPathsCount,
    updateSelectedPaths
  } = useCanvasStore();

  const { undo, redo, pastStates, futureStates } = useTemporalState();
  
    // Computed values
  const selectedCount = selectedIds.length;
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;
  const zoomFactor = 1.2;
  const selectedPathsCount = getSelectedPathsCount();

  // Pencil properties handlers
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

  const handleStrokeNone = () => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeColor: 'none' });
    } else {
      updatePluginState('pencil', { strokeColor: 'none' });
    }
  };

  const handleOpacityChange = (value: number) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ opacity: value });
    } else {
      updatePluginState('pencil', { opacity: value });
    }
  };

  const handleFillColorChange = (value: string) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ fillColor: value });
    } else {
      updatePluginState('pencil', { fillColor: value });
    }
  };

  const handleFillNone = () => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ fillColor: 'none' });
    } else {
      updatePluginState('pencil', { fillColor: 'none' });
    }
  };

  const handleFillOpacityChange = (value: number) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ fillOpacity: value });
    } else {
      updatePluginState('pencil', { fillOpacity: value });
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

  const getCurrentFillColor = () => {
    if (selectedPathsCount > 0) {
      const selectedElements = useCanvasStore.getState().getSelectedElements();
      const pathElements = selectedElements.filter(el => el.type === 'path');
      if (pathElements.length > 0) {
        // Return the fill color of the first selected path
        return (pathElements[0].data as any).fillColor;
      }
    }
    return plugins.pencil.fillColor;
  };

  const getCurrentFillOpacity = () => {
    if (selectedPathsCount > 0) {
      const selectedElements = useCanvasStore.getState().getSelectedElements();
      const pathElements = selectedElements.filter(el => el.type === 'path');
      if (pathElements.length > 0) {
        // Return the fill opacity of the first selected path
        return (pathElements[0].data as any).fillOpacity;
      }
    }
    return plugins.pencil.fillOpacity;
  };

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{
          width: '40px',
          fontSize: '9px',
          fontWeight: '600',
          color: '#666',
          padding: '1px 6px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          textAlign: 'left'
        }}
        title="History: Undos/Redos available">
          {pastStates.length === 0 && futureStates.length === 0 ? '\u00A0' : `${pastStates.length}/${futureStates.length}`}
        </div>
        <div style={{
          width: '40px',
          fontSize: '9px',
          fontWeight: '600',
          color: '#666',
          padding: '1px 6px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          textAlign: 'center'
        }}
        title={`Zoom: ${Math.round((viewport.zoom as number) * 100)}%`}>
          {Math.round((viewport.zoom as number) * 100)}%
        </div>
        <div style={{
          width: '40px',
          fontSize: '9px',
          fontWeight: '600',
          color: '#666',
          padding: '1px 6px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          textAlign: 'right'
        }}
        title={`Selected elements: ${selectedCount}`}>
          {selectedCount === 0 ? '\u00A0' : selectedCount}
        </div>
      </div>

      {/* Main toolbar with essential buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
        {/* Undo/Redo Group */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <IconButton
            onClick={() => undo()}
            disabled={!canUndo}
            active={canUndo}
            activeBgColor="#007bff"
            activeColor="#fff"
            borderColor="#dee2e6"
            size="custom"
            customSize="32px"
            title="Undo"
          >
            <Undo2 size={14} />
          </IconButton>
          <IconButton
            onClick={() => redo()}
            disabled={!canRedo}
            active={canRedo}
            activeBgColor="#007bff"
            activeColor="#fff"
            borderColor="#dee2e6"
            size="custom"
            customSize="32px"
            title="Redo"
          >
            <Redo2 size={14} />
          </IconButton>
        </div>

        {/* Zoom Controls Group */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <IconButton
            onClick={() => zoom(1 / zoomFactor, window.innerWidth / 2, window.innerHeight / 2)}
            borderColor="#dee2e6"
            size="custom"
            customSize="32px"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </IconButton>
          <IconButton
            onClick={resetZoom}
            borderColor="#dee2e6"
            size="custom"
            customSize="32px"
            title="Reset Zoom"
          >
            <RotateCcw size={14} />
          </IconButton>
          <IconButton
            onClick={() => zoom(zoomFactor, window.innerWidth / 2, window.innerHeight / 2)}
            borderColor="#dee2e6"
            size="custom"
            customSize="32px"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </IconButton>
        </div>

        {/* Delete Button */}
        <IconButton
          onClick={deleteSelectedElements}
          disabled={selectedIds.length === 0}
          active={selectedIds.length > 0}
          activeBgColor="#dc3545"
          activeColor="#fff"
          borderColor="#dee2e6"
          size="custom"
          customSize="32px"
          title="Delete Selected"
        >
          <Trash2 size={14} />
        </IconButton>
      </div>

      {/* Pencil Properties Section */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: '8px', marginTop: '8px' }}>
        {/* Stroke Width - First Line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Circle size={14} style={{ color: '#666', flexShrink: 0 }} />
          <input
            type="range"
            min="0"
            max="20"
            value={getCurrentStrokeWidth()}
            onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: '#ddd',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '60px'
            }}
            title="Stroke Width"
          />
          <span style={{
            fontSize: '10px',
            color: '#666',
            width: '31px',
            textAlign: 'right',
            flexShrink: 0
          }}>
            {getCurrentStrokeWidth()}px
          </span>
        </div>

        {/* Stroke Color & Opacity - Second Line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Pen size={14} style={{ color: '#666', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <input
              type="color"
              value={getCurrentStrokeColor() === 'none' ? '#000000' : getCurrentStrokeColor()}
              onChange={(e) => handleStrokeColorChange(e.target.value)}
              style={{
                width: '24px',
                height: '24px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
                opacity: getCurrentStrokeColor() === 'none' ? 0.5 : 1
              }}
              title="Stroke Color"
            />
            <IconButton
              onClick={handleStrokeNone}
              active={getCurrentStrokeColor() === 'none'}
              activeBgColor="#007bff"
              activeColor="#fff"
              borderColor="#ccc"
              size="custom"
              customSize="20px"
              title="No Stroke"
            >
              <X size={12} />
            </IconButton>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '120px' }}>
            <Eye size={14} style={{ color: '#666', flexShrink: 0 }} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={getCurrentOpacity()}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: '#ddd',
                outline: 'none',
                cursor: 'pointer',
                minWidth: '50px'
              }}
              title="Stroke Opacity"
            />
            <span style={{
              fontSize: '10px',
              color: '#666',
              width: '35px',
              textAlign: 'right',
              flexShrink: 0
            }}>
              {Math.round(getCurrentOpacity() * 100)}%
            </span>
          </div>
        </div>

        {/* Fill Color & Opacity - Third Line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PaintBucket size={14} style={{ color: '#666', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <input
              type="color"
              value={getCurrentFillColor() === 'none' ? '#000000' : getCurrentFillColor()}
              onChange={(e) => handleFillColorChange(e.target.value)}
              style={{
                width: '24px',
                height: '24px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
                opacity: getCurrentFillColor() === 'none' ? 0.5 : 1
              }}
              title="Fill Color"
            />
            <IconButton
              onClick={handleFillNone}
              active={getCurrentFillColor() === 'none'}
              activeBgColor="#007bff"
              activeColor="#fff"
              borderColor="#ccc"
              size="custom"
              customSize="20px"
              title="No Fill"
            >
              <X size={12} />
            </IconButton>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '120px' }}>
            <Eye size={14} style={{ color: '#666', flexShrink: 0 }} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={getCurrentFillOpacity()}
              onChange={(e) => handleFillOpacityChange(parseFloat(e.target.value))}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: '#ddd',
                outline: 'none',
                cursor: 'pointer',
                minWidth: '50px'
              }}
              title="Fill Opacity"
            />
            <span style={{
              fontSize: '10px',
              color: '#666',
              width: '35px',
              textAlign: 'right',
              flexShrink: 0
            }}>
              {Math.round(getCurrentFillOpacity() * 100)}%
            </span>
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid #eee', marginTop: '8px' }}></div>
    </div>
  );
};
