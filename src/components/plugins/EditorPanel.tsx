import React, { useState, useEffect, useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
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
import { PresetButton } from '../ui/PresetButton';
import { LinecapSelector } from '../ui/LinecapSelector';
import { LinejoinSelector } from '../ui/LinejoinSelector';
import { FillRuleSelector } from '../ui/FillRuleSelector';
import { DashArrayCustomInput, DashArrayPresets } from '../ui/DashArraySelector';
import { PRESETS, type Preset } from '../../utils/presets';
import { useSelectedPathProperty } from '../../utils/pathPropertyUtils';

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
  const [colorControlsExpanded, setColorControlsExpanded] = useState(false);
  const [advancedStrokeExpanded, setAdvancedStrokeExpanded] = useState(false);

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

  // Handlers for new stroke properties
  const handleStrokeLinecapChange = (value: 'butt' | 'round' | 'square') => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeLinecap: value });
    } else {
      updatePencilState({ strokeLinecap: value });
    }
  };

  const handleStrokeLinejoinChange = (value: 'miter' | 'round' | 'bevel') => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeLinejoin: value });
    } else {
      updatePencilState({ strokeLinejoin: value });
    }
  };

  const handleFillRuleChange = (value: 'nonzero' | 'evenodd') => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ fillRule: value });
    } else {
      updatePencilState({ fillRule: value });
    }
  };

  const handleStrokeDasharrayChange = (value: string) => {
    if (selectedPathsCount > 0) {
      updateSelectedPaths({ strokeDasharray: value });
    } else {
      updatePencilState({ strokeDasharray: value });
    }
  };

  // Get current values from selected elements or plugin defaults
  const currentStrokeWidth = useSelectedPathProperty('strokeWidth', pencil.strokeWidth);
  const currentStrokeColor = useSelectedPathProperty('strokeColor', pencil.strokeColor);
  const currentOpacity = useSelectedPathProperty('strokeOpacity', pencil.strokeOpacity);
  const currentFillColor = useSelectedPathProperty('fillColor', pencil.fillColor);
  const currentFillOpacity = useSelectedPathProperty('fillOpacity', pencil.fillOpacity);
  const currentStrokeLinecap = useSelectedPathProperty('strokeLinecap', pencil.strokeLinecap);
  const currentStrokeLinejoin = useSelectedPathProperty('strokeLinejoin', pencil.strokeLinejoin);
  const currentFillRule = useSelectedPathProperty('fillRule', pencil.fillRule);
  const currentStrokeDasharray = useSelectedPathProperty('strokeDasharray', pencil.strokeDasharray);

  return (
    <div style={{ backgroundColor: '#fff' }}>
      {/* Main toolbar with essential buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', marginTop: '2px', gap: '8px' }}>
        {/* Undo/Redo Group */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <IconButton
            onPointerUp={() => undo()}
            disabled={!canUndo}
            active={canUndo}
            activeBgColor="#007bff"
            activeColor="#fff"
            size="custom"
            customSize="24px"
            title="Undo"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Undo2 size={14} />
              <span style={{ fontSize: '10px', lineHeight: '10px', minWidth: '20px', textAlign: 'right' }}>{pastStates.length}</span>
            </div>
          </IconButton>
          <IconButton
            onPointerUp={() => redo()}
            disabled={!canRedo}
            active={canRedo}
            activeBgColor="#007bff"
            activeColor="#fff"
            size="custom"
            customSize="24px"
            title="Redo"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Redo2 size={14} />
              <span style={{ fontSize: '10px', lineHeight: '10px', minWidth: '20px', textAlign: 'right' }}>{futureStates.length}</span>
            </div>
          </IconButton>
        </div>

        {/* Zoom Controls Group */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <IconButton
            onPointerUp={() => zoom(1 / zoomFactor, window.innerWidth / 2, window.innerHeight / 2)}
            size="custom"
            customSize="24px"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </IconButton>
          <IconButton
            onPointerUp={resetZoom}
            size="custom"
            customSize="24px"
            title="Reset Zoom"
          >
            <span style={{ fontSize: '10px', lineHeight: '10px', minWidth: '32px', textAlign: 'center' }}>{Math.round((viewport.zoom as number) * 100)}%</span>
          </IconButton>
          <IconButton
            onPointerUp={() => zoom(zoomFactor, window.innerWidth / 2, window.innerHeight / 2)}
            size="custom"
            customSize="24px"
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
          customSize="24px"
          title={
            activePlugin === 'edit' ? "Delete Selected Points" :
              activePlugin === 'subpath' ? "Delete Selected Subpaths" :
                "Delete Selected"
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '10px', lineHeight: '10px', minWidth: '20px', textAlign: 'left' }}>{selectedCount}</span>
            <Trash2 size={14} />
          </div>
        </IconButton>
      </div>

      {/* Pencil Properties Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Color Presets */}
          <div style={{ 
            minHeight: '24px', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '2px'
          }}>
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
            <div style={{ marginLeft: '8px' }}>
              <IconButton
                onPointerUp={() => setColorControlsExpanded(!colorControlsExpanded)}
                size="custom"
                customSize="20px"
                title={colorControlsExpanded ? "Collapse Color Controls" : "Expand Color Controls"}
              >
                {colorControlsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </IconButton>
            </div>
          </div>

          {/* Color Controls */}
          {colorControlsExpanded && (
            <>
              {/* Fill Color & Opacity */}
              <div style={{ 
                minHeight: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'flex-start',
                gap: '8px' 
              }}>
                <PaintBucket size={14} style={{ color: '#666', flexShrink: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <input
                    type="color"
                    value={currentFillColor === 'none' ? '#000000' : currentFillColor}
                    onChange={(e) => handleFillColorChange(e.target.value)}
                    style={{
                      width: '20px',
                      height: '20px',
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

              {/* Stroke Color & Opacity */}
              <div style={{ 
                minHeight: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'flex-start',
                gap: '8px' 
              }}>
                <Pen size={14} style={{ color: '#666', flexShrink: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <input
                    type="color"
                    value={currentStrokeColor === 'none' ? '#000000' : currentStrokeColor}
                    onChange={(e) => handleStrokeColorChange(e.target.value)}
                    style={{
                      width: '20px',
                      height: '20px',
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

              {/* Stroke Width */}
              <div style={{ 
                minHeight: '24px', 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'flex-start'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <SliderControl
                    icon={<Circle size={14} />}
                    value={currentStrokeWidth}
                    min={0}
                    max={20}
                    onChange={handleStrokeWidthChange}
                    formatter={(value) => `${value}px`}
                    title="Stroke Width"
                    inline={true}
                  />
                  <div style={{ marginLeft: '8px' }}>
                    <IconButton
                      onPointerUp={() => setAdvancedStrokeExpanded(!advancedStrokeExpanded)}
                      size="custom"
                      customSize="20px"
                      title={advancedStrokeExpanded ? "Collapse Advanced Stroke" : "Expand Advanced Stroke"}
                    >
                      {advancedStrokeExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </IconButton>
                  </div>
                </div>
              </div>

              {/* Advanced Stroke Properties */}
              {advancedStrokeExpanded && (
                <>
                  {/* Advanced Properties - C, J and R in one line */}
                  <div style={{ 
                    minHeight: '24px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ 
                        fontSize: '13px', 
                        fontWeight: '500', 
                        color: '#666', 
                        minWidth: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        height: '24px'
                      }} title="Stroke Linecap">
                        C:
                      </div>
                      <LinecapSelector
                        value={currentStrokeLinecap || 'round'}
                        onChange={handleStrokeLinecapChange}
                        title="Stroke Linecap"
                      />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ 
                        fontSize: '13px', 
                        fontWeight: '500', 
                        color: '#666', 
                        minWidth: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        height: '24px'
                      }} title="Stroke Linejoin">
                        J:
                      </div>
                      <LinejoinSelector
                        value={currentStrokeLinejoin || 'round'}
                        onChange={handleStrokeLinejoinChange}
                        title="Stroke Linejoin"
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ 
                        fontSize: '13px', 
                        fontWeight: '500', 
                        color: '#666', 
                        minWidth: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        height: '24px'
                      }} title="Fill Rule">
                        R:
                      </div>
                      <FillRuleSelector
                        value={currentFillRule || 'nonzero'}
                        onChange={handleFillRuleChange}
                        title="Fill Rule"
                      />
                    </div>
                  </div>

                  {/* Dash Array Presets and Custom Input in one line */}
                  <div style={{ 
                    minHeight: '24px', 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}>
                    <DashArrayPresets
                      value={currentStrokeDasharray || 'none'}
                      onChange={handleStrokeDasharrayChange}
                    />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ 
                        fontSize: '13px', 
                        fontWeight: '500', 
                        color: '#666', 
                        minWidth: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        height: '24px'
                      }} title="Custom Dash Array">
                        D:
                      </div>
                      <div style={{ width: '80px' }}>
                        <DashArrayCustomInput
                          value={currentStrokeDasharray || 'none'}
                          onChange={handleStrokeDasharrayChange}
                          title="Custom dash array (e.g., 5,3,2,3)"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

    </div>
  );
};
