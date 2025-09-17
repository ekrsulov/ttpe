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
import { Tag } from '../ui/Tag';

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
    pencil,
    updatePencilState,
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
      updatePencilState({ strokeWidth: value });
    }
  };

  const handleStrokeColorChange = (value: string) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeColor: value });
    } else {
      updatePencilState({ strokeColor: value });
    }
  };

  const handleStrokeNone = () => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeColor: 'none' });
    } else {
      updatePencilState({ strokeColor: 'none' });
    }
  };

  const handleOpacityChange = (value: number) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeOpacity: value });
    } else {
      updatePencilState({ strokeOpacity: value });
    }
  };

  const handleFillColorChange = (value: string) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ fillColor: value });
    } else {
      updatePencilState({ fillColor: value });
    }
  };

  const handleFillNone = () => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ fillColor: 'none' });
    } else {
      updatePencilState({ fillColor: 'none' });
    }
  };

  const handleFillOpacityChange = (value: number) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ fillOpacity: value });
    } else {
      updatePencilState({ fillOpacity: value });
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
    return pencil.strokeWidth;
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
    return pencil.strokeColor;
  };

  const getCurrentOpacity = () => {
    if (selectedPathsCount > 0) {
      const selectedElements = useCanvasStore.getState().getSelectedElements();
      const pathElements = selectedElements.filter(el => el.type === 'path');
      if (pathElements.length > 0) {
        // Return the opacity of the first selected path
        return (pathElements[0].data as any).strokeOpacity;
      }
    }
    return pencil.strokeOpacity;
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
    return pencil.fillColor;
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
    return pencil.fillOpacity;
  };

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <Tag
          badge
          width="40px"
          title="History: Undos/Redos available"
          textAlign="left"
        >
          {pastStates.length === 0 && futureStates.length === 0 ? '\u00A0' : `${pastStates.length}/${futureStates.length}`}
        </Tag>
        <Tag
          badge
          width="40px"
          title={`Zoom: ${Math.round((viewport.zoom as number) * 100)}%`}
          textAlign="center"
        >
          {Math.round((viewport.zoom as number) * 100)}%
        </Tag>
        <Tag
          badge
          width="40px"
          title={`Selected elements: ${selectedCount}`}
        >
          {selectedCount === 0 ? '\u00A0' : selectedCount}
        </Tag>
      </div>

      {/* Main toolbar with essential buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
        {/* Undo/Redo Group */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <IconButton
            onPointerUp={() => undo()}
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
            onPointerUp={() => redo()}
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
            onPointerUp={() => zoom(1 / zoomFactor, window.innerWidth / 2, window.innerHeight / 2)}
            borderColor="#dee2e6"
            size="custom"
            customSize="32px"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </IconButton>
          <IconButton
            onPointerUp={resetZoom}
            borderColor="#dee2e6"
            size="custom"
            customSize="32px"
            title="Reset Zoom"
          >
            <RotateCcw size={14} />
          </IconButton>
          <IconButton
            onPointerUp={() => zoom(zoomFactor, window.innerWidth / 2, window.innerHeight / 2)}
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
          onPointerUp={deleteSelectedElements}
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
              onPointerUp={handleStrokeNone}
              disabled={getCurrentFillColor() === 'none'}
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
              onPointerUp={handleFillNone}
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
