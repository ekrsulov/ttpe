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
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { SliderControl } from '../ui/SliderControl';
import { Tag } from '../ui/Tag';
import { PresetButton } from '../ui/PresetButton';
import { PRESETS, type Preset } from '../../utils/presets';
import { getSelectedPathProperty } from '../../utils/pathPropertyUtils';

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
    selectedCommands,
    deleteSelectedElements,
    deleteSelectedCommands,
    viewport,
    zoom,
    resetZoom,
    pencil,
    updatePencilState,
    getSelectedPathsCount,
    updateSelectedPaths,
    activePlugin,
    deleteSelectedSubpaths,
    getSelectedSubpathsCount,
  } = useCanvasStore();

  const { undo, redo, pastStates, futureStates } = useTemporalState();
  
  // Computed values
  const selectedCount = selectedIds.length;
  const selectedCommandsCount = selectedCommands.length;
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;
  const zoomFactor = 1.2;
  const selectedPathsCount = getSelectedPathsCount();
  const selectedSubpathsCount = getSelectedSubpathsCount();

  const [isExpanded, setIsExpanded] = useState(false);

  // Handle delete action based on active plugin
  const handleDelete = () => {
    if (activePlugin === 'edit' && selectedCommandsCount > 0) {
      deleteSelectedCommands();
    } else if (activePlugin === 'subpath' && selectedSubpathsCount > 0) {
      deleteSelectedSubpaths();
    } else if (activePlugin === 'select' && selectedCount > 0) {
      deleteSelectedElements();
    }
  };

  // Determine if delete button should be enabled
  const canDelete = (activePlugin === 'edit' && selectedCommandsCount > 0) ||
                    (activePlugin === 'select' && selectedCount > 0) || 
                    (activePlugin === 'subpath' && selectedSubpathsCount > 0);

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

  const handlePresetSelect = (preset: Preset) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({
        strokeWidth: preset.strokeWidth,
        strokeColor: preset.strokeColor,
        strokeOpacity: preset.strokeOpacity,
        fillColor: preset.fillColor,
        fillOpacity: preset.fillOpacity
      });
    } else {
      updatePencilState({
        strokeWidth: preset.strokeWidth,
        strokeColor: preset.strokeColor,
        strokeOpacity: preset.strokeOpacity,
        fillColor: preset.fillColor,
        fillOpacity: preset.fillOpacity
      });
    }
  };

  // Get current values from selected elements or plugin defaults
  const getCurrentStrokeWidth = () => getSelectedPathProperty('strokeWidth', pencil.strokeWidth);
  const getCurrentStrokeColor = () => getSelectedPathProperty('strokeColor', pencil.strokeColor);
  const getCurrentOpacity = () => getSelectedPathProperty('strokeOpacity', pencil.strokeOpacity);
  const getCurrentFillColor = () => getSelectedPathProperty('fillColor', pencil.fillColor);
  const getCurrentFillOpacity = () => getSelectedPathProperty('fillOpacity', pencil.fillOpacity);

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
        {/* Undo/Redo Group */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <IconButton
            onPointerUp={() => undo()}
            disabled={!canUndo}
            active={canUndo}
            activeBgColor="#007bff"
            activeColor="#fff"
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
            size="custom"
            customSize="32px"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </IconButton>
          <IconButton
            onPointerUp={resetZoom}
            size="custom"
            customSize="32px"
            title="Reset Zoom"
          >
            <RotateCcw size={14} />
          </IconButton>
          <IconButton
            onPointerUp={() => zoom(zoomFactor, window.innerWidth / 2, window.innerHeight / 2)}
            size="custom"
            customSize="32px"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </IconButton>
        </div>

        {/* Delete Button */}
        <IconButton
          onPointerUp={handleDelete}
          disabled={!canDelete}
          active={canDelete}
          activeBgColor="#dc3545"
          activeColor="#fff"
          size="custom"
          customSize="32px"
          title={
            activePlugin === 'edit' ? "Delete Selected Points" :
            activePlugin === 'subpath' ? "Delete Selected Subpaths" : 
            "Delete Selected"
          }
        >
          <Trash2 size={14} />
        </IconButton>
      </div>

      {/* Expand/Collapse Chevron */}
      <div style={{ position: 'relative', margin: '0 0' }}>
        {/* Horizontal line */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '1px',
          backgroundColor: '#dee2e6',
          zIndex: 1
        }} />
        
        {/* Circular button in the center */}
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2
        }}>
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              border: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title={isExpanded ? "Collapse Controls" : "Expand Controls"}
          >
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </div>
        </div>
      </div>

      {/* Pencil Properties Section */}
      {isExpanded && (
        <div style={{}}>
          {/* Stroke Width */}
          <SliderControl
            icon={<Circle size={14} />}
            value={getCurrentStrokeWidth()}
            min={0}
            max={20}
            onChange={handleStrokeWidthChange}
            formatter={(value) => `${value}px`}
            title="Stroke Width"
          />

          {/* Stroke Color & Opacity */}
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
                size="custom"
                customSize="20px"
                title="No Stroke"
              >
                <X size={12} />
              </IconButton>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '120px' }}>
              <SliderControl
                icon={<Eye size={14} />}
                value={getCurrentOpacity()}
                min={0}
                max={1}
                step={0.1}
                onChange={handleOpacityChange}
                formatter={(value) => `${Math.round(value * 100)}%`}
                title="Stroke Opacity"
                minWidth="50px"
                valueWidth="35px"
                inline={true}
                gap="4px"
              />
            </div>
          </div>

          {/* Fill Color & Opacity */}
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
                size="custom"
                customSize="20px"
                title="No Fill"
              >
                <X size={12} />
              </IconButton>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '120px' }}>
              <SliderControl
                icon={<Eye size={14} />}
                value={getCurrentFillOpacity()}
                min={0}
                max={1}
                step={0.1}
                onChange={handleFillOpacityChange}
                formatter={(value) => `${Math.round(value * 100)}%`}
                title="Fill Opacity"
                minWidth="50px"
                valueWidth="35px"
                inline={true}
                gap="4px"
              />
            </div>
          </div>
        </div>
      )}

      {/* Smooth Brush controls moved to EditPanel in Sidebar */}

      {/* Presets Section */}
      {isExpanded && (
        <div style={{ paddingTop: '8px', marginTop: '4px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: '3px',
            maxWidth: '230px'
          }}>
            {PRESETS.map((preset) => (
              <PresetButton
                key={preset.id}
                preset={preset}
                onClick={handlePresetSelect}
              />
            ))}
          </div>
          <div style={{ borderTop: '1px solid #eee', marginTop: '8px' }}></div>

        </div>
      )}

    </div>
  );
};
