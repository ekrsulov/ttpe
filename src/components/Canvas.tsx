import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { measurePath, measureSubpathBounds } from '../utils/measurementUtils';
import { extractEditablePoints } from '../utils/pathParserUtils';
import { mapPointerToCanvas } from '../utils/coordinateUtils';
import { commandsToString } from '../utils/pathParserUtils';
import { useCanvasDragInteractions } from '../hooks/useCanvasDragInteractions';
import { SelectionOverlay, EditPointsOverlay, SubpathOverlay, ShapePreview, OpticalAlignmentOverlay, FeedbackOverlay, TransformationOverlay } from './overlays';
import { useCanvasKeyboardControls } from '../hooks/useCanvasKeyboardControls';
import { useCanvasPointerSelection } from '../hooks/useCanvasPointerSelection';
import { useCanvasTransformControls } from '../hooks/useCanvasTransformControls';
import { useCanvasShapeCreation } from '../hooks/useCanvasShapeCreation';
import { useCanvasOpticalAlignment } from '../hooks/useCanvasOpticalAlignment';
import { useCanvasSmoothBrush } from '../hooks/useCanvasSmoothBrush';
import { useCanvasEventHandlers } from '../hooks/useCanvasEventHandlers';
import { PluginManager } from '../utils/pluginManager';
import { toolRegistry } from '../utils/toolRegistry';
import type { Point, PathData, CanvasElement } from '../types';

export const Canvas: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pluginManager = useMemo(() => new PluginManager(toolRegistry), []);
  const { isSpacePressed, isShiftPressed } = useCanvasKeyboardControls();
  const {
    isSelecting,
    selectionStart,
    selectionEnd,
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle
  } = useCanvasPointerSelection(isShiftPressed);
  const {
    transformState,
    feedback,
    startTransformation,
    updateTransformation,
    endTransformation
  } = useCanvasTransformControls();
  const {
    isCreatingShape,
    shapeStart,
    shapeEnd,
    feedback: shapeFeedback,
    startShapeCreation,
    updateShapeCreation,
    endShapeCreation,
    updatePointPositionFeedback
  } = useCanvasShapeCreation();
  const {
    currentAlignment,
    showMathematicalCenter,
    showOpticalCenter,
    showDistanceRules,
  } = useCanvasOpticalAlignment();
  const {
    isActive: isSmoothBrushActive,
    smoothBrush,
    applyBrush,
    updateCursorPosition
  } = useCanvasSmoothBrush();

  // Use specific selectors instead of destructuring the entire store
  const elements = useCanvasStore(state => state.elements);
  const viewport = useCanvasStore(state => state.viewport);
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const transformation = useCanvasStore(state => state.transformation);
  const shape = useCanvasStore(state => state.shape);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const editingPoint = useCanvasStore(state => state.editingPoint);
  const selectedCommands = useCanvasStore(state => state.selectedCommands);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const draggingSelection = useCanvasStore(state => state.draggingSelection);
  const updateElement = useCanvasStore(state => state.updateElement);
  const startDraggingPoint = useCanvasStore(state => state.startDraggingPoint);
  const updateDraggingPoint = useCanvasStore(state => state.updateDraggingPoint);
  const stopDraggingPoint = useCanvasStore(state => state.stopDraggingPoint);
  const emergencyCleanupDrag = useCanvasStore(state => state.emergencyCleanupDrag);
  const selectCommand = useCanvasStore(state => state.selectCommand);
  const selectSubpath = useCanvasStore(state => state.selectSubpath);
  const isWorkingWithSubpaths = useCanvasStore(state => state.isWorkingWithSubpaths);
  const getFilteredEditablePoints = useCanvasStore(state => state.getFilteredEditablePoints);
  const getControlPointInfo = useCanvasStore(state => state.getControlPointInfo);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [hasDragMoved, setHasDragMoved] = useState(false);
  const [canvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Memoize sorted elements to prevent unnecessary re-renders
  const sortedElements = useMemo(() => {
    return [...elements].sort((a, b) => a.zIndex - b.zIndex);
  }, [elements]);

  // Helper functions for event handlers
  const moveSelectedElements = useCallback((deltaX: number, deltaY: number) => {
    useCanvasStore.getState().moveSelectedElements(deltaX, deltaY);
  }, []);

  const moveSelectedSubpaths = useCallback((deltaX: number, deltaY: number) => {
    useCanvasStore.getState().moveSelectedSubpaths(deltaX, deltaY);
  }, []);

  const selectElement = useCallback((elementId: string, toggle: boolean) => {
    useCanvasStore.getState().selectElement(elementId, toggle);
  }, []);

  // Transform screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    return mapPointerToCanvas(svgRef.current, viewport, screenX, screenY);
  }, [viewport]);

  // Helper function to get element bounds considering current transform
  const getElementBounds = (element: typeof elements[0]) => {
    if (element.type === 'path') {
      const pathData = element.data as import('../types').PathData;
      return measurePath(pathData.subPaths, pathData.strokeWidth, viewport.zoom);
    }
    return null;
  };

  const eventHandlerDeps = {
    svgRef,
    screenToCanvas,
    isSpacePressed,
    activePlugin,
    isSelecting,
    selectionStart,
    isDragging,
    dragStart,
    hasDragMoved,
    isCreatingShape,
    shapeStart,
    transformStateIsTransforming: transformState.isTransforming,
    updateTransformation,
    applyBrush,
    updateCursorPosition,
    beginSelectionRectangle,
    startShapeCreation,
    isSmoothBrushActive,
    setIsDragging,
    setDragStart,
    setHasDragMoved,
    moveSelectedElements,
    moveSelectedSubpaths,
    isWorkingWithSubpaths,
    selectedSubpaths,
    selectedIds,
    selectElement,
    startTransformation,
    endTransformation,
    completeSelectionRectangle,
    updateSelectionRectangle,
    updateShapeCreation,
    endShapeCreation,
  };

  const {
    handleElementClick,
    handleElementPointerDown,
    handleTransformationHandlerPointerDown,
    handleTransformationHandlerPointerUp,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleKeyboard,
  } = useCanvasEventHandlers(eventHandlerDeps);

  // Use the custom hook for drag interactions
  const { dragPosition } = useCanvasDragInteractions({
    dragState: {
      editingPoint,
      draggingSelection
    },
    viewport,
    elements: elements as CanvasElement[],
    smoothBrush,
    callbacks: {
      onUpdateDraggingPoint: updateDraggingPoint,
      onStopDraggingPoint: stopDraggingPoint,
      onUpdateElement: updateElement,
      getControlPointInfo
    }
  });

  // Helper function to get transformed bounds
  const getTransformedBounds = (element: typeof elements[0]) => {
    if (element.type === 'path') {
      const pathData = element.data as PathData;
      return measurePath(pathData.subPaths, pathData.strokeWidth, viewport.zoom);
    }
    return null;
  };

  // Render elements
  const renderElement = (element: typeof elements[0]) => {
    const { data, type } = element;
    const isSelected = selectedIds.includes(element.id);

    switch (type) {
      case 'path': {
        const pathData = data as PathData;
        // For pencil paths, if strokeColor is 'none', render with black
        const effectiveStrokeColor = pathData.isPencilPath && pathData.strokeColor === 'none'
          ? '#000000'
          : pathData.strokeColor;

        const pathD = commandsToString(pathData.subPaths.flat());

        return (
          <g key={element.id}>
            <path
              d={pathD}
              stroke={effectiveStrokeColor}
              strokeWidth={pathData.strokeWidth}
              fill={pathData.fillColor}
              fillOpacity={pathData.fillOpacity}
              strokeLinecap={pathData.strokeLinecap || "round"}
              strokeLinejoin={pathData.strokeLinejoin || "round"}
              vectorEffect="non-scaling-stroke"
              opacity={pathData.strokeOpacity}
              onPointerUp={(e) => handleElementClick(element.id, e)}
              onPointerDown={(e) => handleElementPointerDown(element.id, e)}
              style={{
                cursor: activePlugin === 'select' ? (isSelected ? 'move' : 'pointer') : 'default',
                pointerEvents: activePlugin === 'subpath' ? 'none' : 'auto'
              }}
            />
            {/* Selection overlay */}
            {isSelected && (activePlugin !== 'transformation' || isWorkingWithSubpaths()) && (
              <SelectionOverlay
                element={element}
                bounds={getTransformedBounds(element)}
                viewport={viewport}
                selectedSubpaths={selectedSubpaths}
                activePlugin={activePlugin}
              />
            )}

            {/* Transformation overlay - always render but control visibility */}
            <div style={{ display: isSelected && activePlugin === 'transformation' ? 'block' : 'none' }}>
              <TransformationOverlay
                element={element}
                bounds={getTransformedBounds(element)}
                selectedSubpaths={selectedSubpaths}
                viewport={viewport}
                activePlugin={activePlugin}
                transformation={transformation}
                isWorkingWithSubpaths={isWorkingWithSubpaths()}
                onTransformationHandlerPointerDown={handleTransformationHandlerPointerDown}
                onTransformationHandlerPointerUp={handleTransformationHandlerPointerUp}
              />
            </div>

            {/* Edit overlay - always render but control visibility */}
            <div style={{ display: isSelected && activePlugin === 'edit' ? 'block' : 'none' }}>
              <EditPointsOverlay
                element={element}
                selectedCommands={selectedCommands}
                editingPoint={editingPoint}
                draggingSelection={draggingSelection}
                dragPosition={dragPosition}
                viewport={viewport}
                smoothBrush={smoothBrush}
                getFilteredEditablePoints={getFilteredEditablePoints}
                onStartDraggingPoint={startDraggingPoint}
                onSelectCommand={selectCommand}
              />
            </div>

            {/* Subpath overlay - always render but control visibility */}
            <div style={{ display: isSelected && activePlugin === 'subpath' ? 'block' : 'none' }}>
              <SubpathOverlay
                element={element}
                selectedSubpaths={selectedSubpaths}
                viewport={viewport}
                smoothBrush={smoothBrush}
                onSelectSubpath={selectSubpath}
                onSetDragStart={setDragStart}
              />
            </div>
          </g>
        );
      }
      default:
        return null;
    }
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleKeyboard(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyboard]);

  // Update point position feedback when selection changes
  useEffect(() => {
    if (activePlugin === 'edit' && selectedCommands.length === 1) {
      const selectedCommand = selectedCommands[0];
      const element = elements.find(el => el.id === selectedCommand.elementId);
      
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const commands = pathData.subPaths.flat();
        const points = extractEditablePoints(commands);
        
        // Find the specific point
        const point = points.find(p => 
          p.commandIndex === selectedCommand.commandIndex && 
          p.pointIndex === selectedCommand.pointIndex
        );
        
        if (point) {
          updatePointPositionFeedback(point.x, point.y, true);
          return;
        }
      }
    }
    
    // Hide feedback if conditions not met
    updatePointPositionFeedback(0, 0, false);
  }, [activePlugin, selectedCommands, elements, updatePointPositionFeedback]);

  // Emergency cleanup listeners for drag states
  useEffect(() => {
    const handleEmergencyCleanup = () => {
      if (editingPoint?.isDragging || draggingSelection?.isDragging) {
        emergencyCleanupDrag();
      }
    };

    // Multiple emergency cleanup triggers
    window.addEventListener('beforeunload', handleEmergencyCleanup);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        handleEmergencyCleanup();
      }
    });

    // Cleanup on component unmount
    return () => {
      handleEmergencyCleanup();
      window.removeEventListener('beforeunload', handleEmergencyCleanup);
    };
  }, [editingPoint?.isDragging, draggingSelection?.isDragging, emergencyCleanupDrag]);

  return (
    <svg
      ref={svgRef}
      width={canvasSize.width}
      height={canvasSize.height}
      viewBox={`${-viewport.panX / viewport.zoom} ${-viewport.panY / viewport.zoom} ${canvasSize.width / viewport.zoom} ${canvasSize.height / viewport.zoom}`}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        cursor: (isSpacePressed || activePlugin === 'pan') ? 'grabbing' :
          pluginManager.getCursor(activePlugin || 'select')
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Sort elements by zIndex */}
      {sortedElements.map(renderElement)}

      {/* Selection rectangle */}
      {isSelecting && selectionStart && selectionEnd && (
        <rect
          x={Math.min(selectionStart.x, selectionEnd.x)}
          y={Math.min(selectionStart.y, selectionEnd.y)}
          width={Math.abs(selectionEnd.x - selectionStart.x)}
          height={Math.abs(selectionEnd.y - selectionStart.y)}
          fill="rgba(0, 123, 255, 0.1)"
          stroke="#007bff"
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
        />
      )}

      {/* Shape preview */}
      {isCreatingShape && shapeStart && shapeEnd && (
        <ShapePreview
          selectedShape={shape?.selectedShape}
          shapeStart={shapeStart}
          shapeEnd={shapeEnd}
          viewport={viewport}
        />
      )}

      {/* Smooth Brush Cursor */}
      {activePlugin === 'edit' && isSmoothBrushActive && (
        <ellipse
          cx={smoothBrush.cursorX}
          cy={smoothBrush.cursorY}
          rx={smoothBrush.radius}
          ry={smoothBrush.radius}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.2"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Optical Alignment Overlay */}
      {activePlugin === 'select' && (
        <OpticalAlignmentOverlay
          alignment={currentAlignment}
          showMathematicalCenter={showMathematicalCenter}
          showOpticalCenter={showOpticalCenter}
          showDistanceRules={showDistanceRules}
          viewport={viewport}
        />
      )}

      {/* Transformation Overlay */}
      {((selectedIds.length > 0 && !isWorkingWithSubpaths()) || (selectedSubpaths.length > 0 && isWorkingWithSubpaths())) &&
        (isWorkingWithSubpaths() ? selectedSubpaths : selectedIds).map(item => {
          const elementId = typeof item === 'string' ? item : item.elementId;
          const element = elements.find(el => el.id === elementId);
          if (!element) return null;

          // Calculate bounds for the element or subpath
          let bounds = null;
          if (element.type === 'path') {
            if (isWorkingWithSubpaths()) {
              // For subpaths, calculate bounds for the specific subpath
              const subpathIndex = typeof item === 'string' ? 0 : item.subpathIndex;
              const pathData = element.data as import('../types').PathData;
              bounds = measureSubpathBounds(
                pathData.subPaths[subpathIndex],
                pathData.strokeWidth || 1,
                viewport.zoom
              );
            } else {
              // For regular elements, calculate full bounds
              bounds = getElementBounds(element);
            }
          }

          return (
            <TransformationOverlay
              key={isWorkingWithSubpaths() ? `subpath-${elementId}-${typeof item === 'string' ? 0 : item.subpathIndex}` : elementId}
              element={element}
              bounds={bounds}
              selectedSubpaths={selectedSubpaths}
              viewport={viewport}
              activePlugin={activePlugin}
              transformation={transformation}
              isWorkingWithSubpaths={isWorkingWithSubpaths()}
              onTransformationHandlerPointerDown={handleTransformationHandlerPointerDown}
              onTransformationHandlerPointerUp={handleTransformationHandlerPointerUp}
            />
          );
        })}

      <FeedbackOverlay
        viewport={viewport}
        canvasSize={canvasSize}
        rotationFeedback={feedback.rotation}
        resizeFeedback={feedback.resize}
        shapeFeedback={shapeFeedback.shape}
        pointPositionFeedback={shapeFeedback.pointPosition}
      />

      {/* Tool-specific overlays */}
      {activePlugin && pluginManager.getOverlays(activePlugin).map((OverlayComponent, index) => (
        <OverlayComponent key={index} viewport={viewport} />
      ))}
    </svg>
  );
};