import React, { useState, useEffect, useMemo } from 'react';
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
  // Use specific selectors instead of destructuring the entire store
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedCommands = useCanvasStore(state => state.selectedCommands);
  const deleteSelectedElements = useCanvasStore(state => state.deleteSelectedElements);
  const deleteSelectedCommands = useCanvasStore(state => state.deleteSelectedCommands);
  const viewport = useCanvasStore(state => state.viewport);
  const zoom = useCanvasStore(state => state.zoom);
  const resetZoom = useCanvasStore(state => state.resetZoom);
  const pencil = useCanvasStore(state => state.pencil);
  const updatePencilState = useCanvasStore(state => state.updatePencilState);
  const getSelectedPathsCount = useCanvasStore(state => state.getSelectedPathsCount);
  const updateSelectedPaths = useCanvasStore(state => state.updateSelectedPaths);
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const deleteSelectedSubpaths = useCanvasStore(state => state.deleteSelectedSubpaths);
  const getSelectedSubpathsCount = useCanvasStore(state => state.getSelectedSubpathsCount);
  const elements = useCanvasStore(state => state.elements);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);

  const { undo, redo, pastStates, futureStates } = useTemporalState();

  // Memoize computed values to prevent unnecessary re-renders
  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);
  const selectedCommandsCount = useMemo(() => selectedCommands.length, [selectedCommands]);
  const canUndo = useMemo(() => pastStates.length > 0, [pastStates.length]);
  const canRedo = useMemo(() => futureStates.length > 0, [futureStates.length]);
  const selectedPathsCount = useMemo(() => getSelectedPathsCount(), [selectedIds, elements]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedSubpathsCount = useMemo(() => getSelectedSubpathsCount(), [selectedSubpaths]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomFactor = 1.2;
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
  const canDelete = useMemo(() => 
    (activePlugin === 'edit' && selectedCommandsCount > 0) ||
    (activePlugin === 'select' && selectedCount > 0) ||
    (activePlugin === 'subpath' && selectedSubpathsCount > 0),
    [activePlugin, selectedCommandsCount, selectedCount, selectedSubpathsCount]
  );

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
  const currentStrokeWidth = useMemo(() => getSelectedPathProperty('strokeWidth', pencil.strokeWidth), [pencil.strokeWidth]);
  const currentStrokeColor = useMemo(() => getSelectedPathProperty('strokeColor', pencil.strokeColor), [pencil.strokeColor]);
  const currentOpacity = useMemo(() => getSelectedPathProperty('strokeOpacity', pencil.strokeOpacity), [pencil.strokeOpacity]);
  const currentFillColor = useMemo(() => getSelectedPathProperty('fillColor', pencil.fillColor), [pencil.fillColor]);
  const currentFillOpacity = useMemo(() => getSelectedPathProperty('fillOpacity', pencil.fillOpacity), [pencil.fillOpacity]);

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
            value={currentStrokeWidth}
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
                value={currentStrokeColor === 'none' ? '#000000' : currentStrokeColor}
                onChange={(e) => handleStrokeColorChange(e.target.value)}
                style={{
                  width: '24px',
                  height: '24px',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  opacity: currentStrokeColor === 'none' ? 0.5 : 1
                }}
                title="Stroke Color"
              />
              <IconButton
                onPointerUp={handleStrokeNone}
                disabled={currentFillColor === 'none'}
                active={currentStrokeColor === 'none'}
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
                value={currentOpacity}
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
                value={currentFillColor === 'none' ? '#000000' : currentFillColor}
                onChange={(e) => handleFillColorChange(e.target.value)}
                style={{
                  width: '24px',
                  height: '24px',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  opacity: currentFillColor === 'none' ? 0.5 : 1
                }}
                title="Fill Color"
              />
              <IconButton
                onPointerUp={handleFillNone}
                active={currentFillColor === 'none'}
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
                value={currentFillOpacity}
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
