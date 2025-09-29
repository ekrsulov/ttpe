import React, { useState, Suspense, useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { IconButton } from './ui/IconButton';
import type { PathData } from '../types';
import {
  Hand,
  Pen,
  Type,
  MousePointer,
  Shapes,
  VectorSquare,
  MousePointerClick,
  ChevronUp,
  ChevronDown,
  Route,
  File,
  Settings
} from 'lucide-react';

// Lazy load panel components
const EditorPanel = React.lazy(() => import('./plugins/EditorPanel').then(module => ({ default: module.EditorPanel })));
const EditPanel = React.lazy(() => import('./plugins/EditPanel').then(module => ({ default: module.EditPanel })));
const ArrangePanel = React.lazy(() => import('./plugins/ArrangePanel').then(module => ({ default: module.ArrangePanel })));
const PanPanel = React.lazy(() => import('./plugins/PanPanel').then(module => ({ default: module.PanPanel })));
const TransformationPanel = React.lazy(() => import('./plugins/TransformationPanel').then(module => ({ default: module.TransformationPanel })));
const TextPanel = React.lazy(() => import('./plugins/TextPanel').then(module => ({ default: module.TextPanel })));
const SelectPanel = React.lazy(() => import('./plugins/SelectPanel').then(module => ({ default: module.SelectPanel })));
const ShapePanel = React.lazy(() => import('./plugins/ShapePanel').then(module => ({ default: module.ShapePanel })));
const PencilPanel = React.lazy(() => import('./plugins/PencilPanel').then(module => ({ default: module.PencilPanel })));
const ControlPointAlignmentPanel = React.lazy(() => import('./plugins/ControlPointAlignmentPanel').then(module => ({ default: module.ControlPointAlignmentPanel })));
const OpticalAlignmentPanel = React.lazy(() => import('./plugins/OpticalAlignmentPanel').then(module => ({ default: module.OpticalAlignmentPanel })));
const FilePanel = React.lazy(() => import('./plugins/FilePanel').then(module => ({ default: module.FilePanel })));
const SettingsPanel = React.lazy(() => import('./plugins/SettingsPanel').then(module => ({ default: module.SettingsPanel })));
const PathOperationsPanel = React.lazy(() => import('./plugins/PathOperationsPanel').then(module => ({ default: module.PathOperationsPanel })));
const SubPathOperationsPanel = React.lazy(() => import('./plugins/SubPathOperationsPanel').then(module => ({ default: module.SubPathOperationsPanel })));

export const Sidebar: React.FC = () => {
  // Use specific selectors instead of destructuring the entire store
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const setMode = useCanvasStore(state => state.setMode);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const elements = useCanvasStore(state => state.elements);
  const smoothBrush = useCanvasStore(state => state.smoothBrush);
  const pathSimplification = useCanvasStore(state => state.pathSimplification);
  const selectedCommands = useCanvasStore(state => state.selectedCommands);
  const updateSmoothBrush = useCanvasStore(state => state.updateSmoothBrush);
  const updatePathSimplification = useCanvasStore(state => state.updatePathSimplification);
  const applySmoothBrush = useCanvasStore(state => state.applySmoothBrush);
  const applyPathSimplification = useCanvasStore(state => state.applyPathSimplification);
  const activateSmoothBrush = useCanvasStore(state => state.activateSmoothBrush);
  const deactivateSmoothBrush = useCanvasStore(state => state.deactivateSmoothBrush);
  const setActivePlugin = useCanvasStore(state => state.setActivePlugin);
  const [isArrangeExpanded, setIsArrangeExpanded] = useState(false);
  const [showFilePanel, setShowFilePanel] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  const _plugins = useMemo(() => [
    { name: 'select', label: 'Select', icon: MousePointer },
    { name: 'subpath', label: 'Subpath', icon: Route },
    { name: 'transformation', label: 'Transform', icon: VectorSquare },
    { name: 'edit', label: 'Edit', icon: MousePointerClick },
    { name: 'pan', label: 'Pan', icon: Hand },
    { name: 'pencil', label: 'Pencil', icon: Pen },
    { name: 'text', label: 'Text', icon: Type },
    { name: 'shape', label: 'Shape', icon: Shapes },
  ], []);

  // Memoize disabled state calculations to prevent unnecessary re-renders
  const pluginDisabledStates = useMemo(() => {
    const selectedElements = elements.filter(el => selectedIds.includes(el.id));
    
    return _plugins.reduce((acc, plugin) => {
      let isDisabled = false;
      if (plugin.name === 'transformation' || plugin.name === 'edit') {
        isDisabled = !(selectedIds.length === 1 || selectedSubpaths.length === 1) || selectedSubpaths.length > 1;
      } else if (plugin.name === 'subpath') {
        isDisabled = !(selectedElements.length === 1 && 
                       selectedElements[0].type === 'path' && 
                       (selectedElements[0].data as PathData).subPaths?.length > 1);
      }
      acc[plugin.name] = isDisabled;
      return acc;
    }, {} as Record<string, boolean>);
  }, [selectedIds, selectedSubpaths, elements, _plugins]);

  // Helper function to render plugin buttons
  const renderPluginButton = (plugin: typeof _plugins[0]) => {
    const IconComponent = plugin.icon;
    const isDisabled = pluginDisabledStates[plugin.name];
    
    // Special handling for file and settings buttons
    if (plugin.name === 'file') {
      return (
        <IconButton
          key={plugin.name}
          onPointerUp={() => {
            if (showFilePanel) {
              // If closing file panel, go to select mode
              setMode('select');
              setShowFilePanel(false);
            } else {
              // If opening file panel, turn off current mode and close settings
              setActivePlugin(null);
              setShowConfigPanel(false);
              setShowFilePanel(true);
            }
          }}
          active={showFilePanel}
          activeBgColor="#007bff"
          activeColor="#fff"
          size="custom"
          customSize="30px"
          title={plugin.label}
        >
          <IconComponent size={14} />
        </IconButton>
      );
    }
    
    if (plugin.name === 'settings') {
      return (
        <IconButton
          key={plugin.name}
          onPointerUp={() => {
            if (showConfigPanel) {
              // If closing settings panel, go to select mode
              setMode('select');
              setShowConfigPanel(false);
            } else {
              // If opening settings panel, turn off current mode and close file
              setActivePlugin(null);
              setShowFilePanel(false);
              setShowConfigPanel(true);
            }
          }}
          active={showConfigPanel}
          activeBgColor="#007bff"
          activeColor="#fff"
          size="custom"
          customSize="30px"
          title={plugin.label}
        >
          <IconComponent size={14} />
        </IconButton>
      );
    }
    
    return (
      <IconButton
        key={plugin.name}
        onPointerUp={() => {
          if (!isDisabled) {
            setMode(plugin.name);
            // Close file and settings panels when switching to another mode
            setShowFilePanel(false);
            setShowConfigPanel(false);
          }
        }}
        disabled={isDisabled}
        active={activePlugin === plugin.name}
        activeBgColor="#007bff"
        activeColor="#fff"
        size="custom"
        customSize="30px"
        title={plugin.label}
      >
        <IconComponent size={14} />
      </IconButton>
    );
  };

  // Create rows with 5 buttons each
  const pluginRows = [
    [
      { name: 'select', label: 'Select', icon: MousePointer },
      { name: 'subpath', label: 'Subpath', icon: Route },
      { name: 'transformation', label: 'Transform', icon: VectorSquare },
      { name: 'edit', label: 'Edit', icon: MousePointerClick },
      { name: 'file', label: 'File', icon: File },
    ],
    [
      { name: 'pan', label: 'Pan', icon: Hand },
      { name: 'pencil', label: 'Pencil', icon: Pen },
      { name: 'text', label: 'Text', icon: Type },
      { name: 'shape', label: 'Shape', icon: Shapes },
      { name: 'settings', label: 'Settings', icon: Settings },
    ],
  ];

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: '250px',
      height: '100vh',
      backgroundColor: 'rgba(249, 249, 249, 0.95)',
      backdropFilter: 'blur(10px)',
      borderLeft: '1px solid #ccc',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Fixed tools section */}
      <div style={{
        padding: '4px 8px 4px 8px',
        backgroundColor: '#fff'
      }}>
        {/* Plugin button grid */}
        {pluginRows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '2px',
              marginBottom: rowIndex < pluginRows.length - 1 ? '2px' : '0'
            }}
          >
            {row.map(renderPluginButton)}
          </div>
        ))}
      </div>

      {/* Scrollable panels section */}
      <div style={{
        flex: 1,
        padding: '0px 8px 8px 8px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: '#fff'
      }}>
        <Suspense fallback={<div style={{ height: '20px', backgroundColor: '#f8f9fa' }} />}>
          <EditorPanel />
          <div style={{ display: activePlugin === 'select' ? 'block' : 'none' }}>
            <PathOperationsPanel />
          </div>
          <SubPathOperationsPanel />
          <div style={{ display: showFilePanel ? 'block' : 'none' }}>
            <FilePanel />
          </div>
          <div style={{ display: showConfigPanel ? 'block' : 'none' }}>
            <SettingsPanel />
          </div>
          <div style={{ display: activePlugin === 'edit' ? 'block' : 'none' }}>
            <EditPanel
              activePlugin={activePlugin}
              smoothBrush={smoothBrush}
              pathSimplification={pathSimplification}
              selectedCommands={selectedCommands}
              updateSmoothBrush={updateSmoothBrush}
              updatePathSimplification={updatePathSimplification}
              applySmoothBrush={applySmoothBrush}
              applyPathSimplification={applyPathSimplification}
              activateSmoothBrush={activateSmoothBrush}
              deactivateSmoothBrush={deactivateSmoothBrush}
            />
          </div>
          <div style={{ display: activePlugin === 'edit' ? 'block' : 'none' }}>
            <ControlPointAlignmentPanel />
          </div>
          <div style={{ display: activePlugin === 'select' ? 'block' : 'none' }}>
            <OpticalAlignmentPanel />
          </div>
          <div style={{ display: activePlugin === 'pan' ? 'block' : 'none' }}>
            <PanPanel />
          </div>
          <div style={{ display: activePlugin === 'pencil' ? 'block' : 'none' }}>
            <PencilPanel />
          </div>
          <div style={{ display: activePlugin === 'transformation' ? 'block' : 'none' }}>
            <TransformationPanel />
          </div>
          <div style={{ display: activePlugin === 'text' ? 'block' : 'none' }}>
            <TextPanel />
          </div>
          <div style={{ display: activePlugin === 'shape' ? 'block' : 'none' }}>
            <ShapePanel />
          </div>
        </Suspense>
      </div>

      {/* Fixed SelectPanel at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {isArrangeExpanded && <ArrangePanel />}

        {/* Expand/Collapse Chevron for Arrange */}
        <div style={{ position: 'relative', margin: '4px 0' }}>
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
              onClick={() => setIsArrangeExpanded(!isArrangeExpanded)}
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
              title={isArrangeExpanded ? "Collapse Arrange" : "Expand Arrange"}
            >
              {isArrangeExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </div>
          </div>
        </div>

        <SelectPanel />
      </div>
    </div>
  );
};