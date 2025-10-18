import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import { measurePath, measureSubpathBounds, mapPointerToCanvas } from '../utils/geometry';
import { extractEditablePoints, commandsToString } from '../utils/path';
import { useCanvasDragInteractions } from '../hooks/useCanvasDragInteractions';
import { SelectionOverlay, FeedbackOverlay } from './overlays';
import { EditPointsOverlay } from '../plugins/edit/EditPointsOverlay';
import { SubpathOverlay } from '../plugins/subpath/SubpathOverlay';
import { ShapePreview } from '../plugins/shape/ShapePreview';
import { TransformationOverlay } from '../plugins/transformation/TransformationOverlay';
import { GuidelinesOverlay } from '../plugins/guidelines/GuidelinesOverlay';
import { GridOverlay } from '../plugins/grid/GridOverlay';
import { CurvesRenderer } from '../plugins/curves/CurvesRenderer';
import { useCanvasKeyboardControls } from '../hooks/useCanvasKeyboardControls';
import { useCanvasPointerSelection } from '../hooks/useCanvasPointerSelection';
import { useCanvasTransformControls } from '../plugins/transformation/useCanvasTransformControls';
import { useCanvasShapeCreation } from '../hooks/useCanvasShapeCreation';
import { useCanvasSmoothBrush } from '../hooks/useCanvasSmoothBrush';
import { useCanvasEventHandlers } from '../hooks/useCanvasEventHandlers';
import { pluginManager } from '../utils/pluginManager';
import { logger } from '../utils';
import { RenderCountBadgeWrapper } from './ui/RenderCountBadgeWrapper';
import type { Point, PathData, CanvasElement, GroupElement } from '../types';

export const Canvas: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
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
    isActive: isSmoothBrushActive,
    smoothBrush,
    applyBrush,
    updateCursorPosition
  } = useCanvasSmoothBrush();
  
  // Local state for smooth brush cursor position (not in store to avoid re-renders)
  const [smoothBrushCursor, setSmoothBrushCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Use shallow selector to prevent unnecessary re-renders
  // Only re-render when values actually change (not just reference)
  const {
    elements,
    viewport,
    activePlugin,
    transformation,
    shape,
    selectedIds,
    editingPoint,
    selectedCommands,
    selectedSubpaths,
    draggingSelection,
    guidelines,
    grid,
    updateElement,
    startDraggingPoint,
    stopDraggingPoint,
    emergencyCleanupDrag,
    selectCommand,
    selectSubpath,
    isWorkingWithSubpaths,
    getFilteredEditablePoints,
    getControlPointInfo,
    saveAsPng,
    snapToGrid,
    clearGuidelines,
    isElementHidden,
  } = useCanvasStore(
    useShallow((state) => ({
      elements: state.elements,
      viewport: state.viewport,
      activePlugin: state.activePlugin,
      transformation: state.transformation,
      shape: state.shape,
      selectedIds: state.selectedIds,
      editingPoint: state.editingPoint,
      selectedCommands: state.selectedCommands,
      selectedSubpaths: state.selectedSubpaths,
      draggingSelection: state.draggingSelection,
      guidelines: state.guidelines,
      grid: state.grid,
      updateElement: state.updateElement,
      startDraggingPoint: state.startDraggingPoint,
      stopDraggingPoint: state.stopDraggingPoint,
      emergencyCleanupDrag: state.emergencyCleanupDrag,
      selectCommand: state.selectCommand,
      selectSubpath: state.selectSubpath,
      isWorkingWithSubpaths: state.isWorkingWithSubpaths,
      getFilteredEditablePoints: state.getFilteredEditablePoints,
      getControlPointInfo: state.getControlPointInfo,
      saveAsPng: state.saveAsPng,
      snapToGrid: state.snapToGrid,
      clearGuidelines: state.clearGuidelines,
      isElementHidden: state.isElementHidden,
    }))
  );
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [hasDragMoved, setHasDragMoved] = useState(false);
  
  // Use dynamic canvas size that updates with viewport changes (Safari toolbar show/hide)
  const [canvasSize, setCanvasSize] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });

  // Update canvas size on resize and viewport changes (Safari iOS toolbar)
  useEffect(() => {
    const updateCanvasSize = () => {
      // Use visualViewport if available (better for mobile Safari)
      const width = window.visualViewport?.width ?? window.innerWidth;
      const height = window.visualViewport?.height ?? window.innerHeight;
      setCanvasSize({ width, height });
    };

    // Listen to both resize and visualViewport changes
    window.addEventListener('resize', updateCanvasSize);
    window.visualViewport?.addEventListener('resize', updateCanvasSize);
    window.visualViewport?.addEventListener('scroll', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      window.visualViewport?.removeEventListener('resize', updateCanvasSize);
      window.visualViewport?.removeEventListener('scroll', updateCanvasSize);
    };
  }, []);

  // Memoize sorted elements to prevent unnecessary re-renders
  const sortedElements = useMemo(() => {
    return [...elements].sort((a, b) => a.zIndex - b.zIndex);
  }, [elements]);

  const elementMap = useMemo(() => {
    const map = new Map<string, CanvasElement>();
    elements.forEach((el) => {
      map.set(el.id, el);
    });
    return map;
  }, [elements]);

  const calculateGroupBounds = useCallback(
    (group: GroupElement, visited: Set<string> = new Set()): { minX: number; minY: number; maxX: number; maxY: number } | null => {
      if (visited.has(group.id)) {
        return null;
      }
      visited.add(group.id);

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let hasBounds = false;

      group.data.childIds.forEach((childId) => {
        const child = elementMap.get(childId);
        if (!child) {
          return;
        }

        if (isElementHidden && isElementHidden(child.id)) {
          return;
        }

        if (child.type === 'group') {
          const childBounds = calculateGroupBounds(child as GroupElement, visited);
          if (childBounds) {
            minX = Math.min(minX, childBounds.minX);
            minY = Math.min(minY, childBounds.minY);
            maxX = Math.max(maxX, childBounds.maxX);
            maxY = Math.max(maxY, childBounds.maxY);
            hasBounds = true;
          }
        } else if (child.type === 'path') {
          const pathData = child.data as PathData;
          const bounds = measurePath(pathData.subPaths, pathData.strokeWidth, viewport.zoom);
          if (bounds) {
            minX = Math.min(minX, bounds.minX);
            minY = Math.min(minY, bounds.minY);
            maxX = Math.max(maxX, bounds.maxX);
            maxY = Math.max(maxY, bounds.maxY);
            hasBounds = true;
          }
        }
      });

      visited.delete(group.id);

      if (!hasBounds) {
        return null;
      }

      return { minX, minY, maxX, maxY };
    },
    [elementMap, isElementHidden, viewport.zoom]
  );

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

  const setMode = useCallback((mode: string) => {
    useCanvasStore.getState().setMode(mode);
  }, []);

  // Transform screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    const currentViewport = useCanvasStore.getState().viewport;
    return mapPointerToCanvas(svgRef.current, currentViewport, screenX, screenY);
  }, []);

  // Helper function to get element bounds considering current transform
  const getElementBounds = (element: typeof elements[0]) => {
    if (element.type === 'path') {
      const pathData = element.data as import('../types').PathData;
      return measurePath(pathData.subPaths, pathData.strokeWidth, viewport.zoom);
    }
    return null;
  };

  const eventHandlerDeps = useMemo(() => ({
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
    setMode,
  }), [
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
    transformState.isTransforming,
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
    setMode,
  ]);

  const {
    handleElementClick,
    handleElementDoubleClick,
    handleSubpathDoubleClick,
    handleElementPointerDown,
    handleTransformationHandlerPointerDown,
    handleTransformationHandlerPointerUp,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleKeyboard,
    handleCanvasDoubleClick,
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
      onStopDraggingPoint: stopDraggingPoint,
      onUpdateElement: updateElement,
      getControlPointInfo,
      snapToGrid,
      clearGuidelines,
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

    if (isElementHidden && isElementHidden(element.id)) {
      return null;
    }

    switch (type) {
      case 'path': {
        const pathData = data as PathData;
        
        // Handle stroke color rendering
        let effectiveStrokeColor = pathData.strokeColor;
        if (pathData.strokeColor === 'none') {
          // For paths with stroke='none', use almost transparent black to make them selectable
          // Exception: pencil paths with stroke='none' use solid black for visibility
          effectiveStrokeColor = pathData.isPencilPath ? '#000000' : '#00000001';
        }

        // For paths with fill='none', use almost transparent white to make them selectable
        const effectiveFillColor = pathData.fillColor === 'none' ? '#ffffff01' : pathData.fillColor;

        const pathD = commandsToString(pathData.subPaths.flat());

        return (
          <g key={element.id}>
            <path
              data-element-id={element.id}
              d={pathD}
              stroke={effectiveStrokeColor}
              strokeWidth={pathData.strokeWidth / viewport.zoom}
              fill={effectiveFillColor}
              fillOpacity={pathData.fillOpacity}
              strokeOpacity={pathData.strokeOpacity}
              strokeLinecap={pathData.strokeLinecap || "round"}
              strokeLinejoin={pathData.strokeLinejoin || "round"}
              fillRule={pathData.fillRule || "nonzero"}
              strokeDasharray={pathData.strokeDasharray && pathData.strokeDasharray !== 'none' ? pathData.strokeDasharray : undefined}
              onPointerUp={(e) => handleElementClick(element.id, e)}
              onPointerDown={(e) => handleElementPointerDown(element.id, e)}
              onDoubleClick={(e) => handleElementDoubleClick(element.id, e)}
              style={{
                cursor: activePlugin === 'select' ? (isSelected ? 'move' : 'pointer') : 'default',
                pointerEvents: activePlugin === 'subpath' ? 'none' : 'auto'
              }}
            />
            {/* Selection overlay */}
            {isSelected && (activePlugin !== 'transformation' || selectedSubpaths.some(sp => sp.elementId === element.id)) && (
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
            {(isSelected || selectedSubpaths.some(sp => sp.elementId === element.id)) && activePlugin === 'edit' && (
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
            )}

            {/* Subpath overlay - render in subpath mode, and also in transformation/edit mode for double-click handling */}
            {((activePlugin === 'subpath') || (activePlugin === 'transformation') || (activePlugin === 'edit')) && element.type === 'path' && (element.data as import('../types').PathData).subPaths?.length > 1 && (
              <SubpathOverlay
                element={element}
                selectedSubpaths={selectedSubpaths}
                viewport={viewport}
                smoothBrush={smoothBrush}
                onSelectSubpath={selectSubpath}
                onSetDragStart={setDragStart}
                onSubpathDoubleClick={handleSubpathDoubleClick}
                isVisible={activePlugin === 'subpath'}
              />
            )}
          </g>
        );
      }
      default:
        return null;
    }
  };

  const selectedGroupBounds = useMemo(() => {
    const groupIds = new Set<string>();

    selectedIds.forEach((id) => {
      const element = elementMap.get(id);
      if (!element) {
        return;
      }

      if (element.type === 'group') {
        groupIds.add(element.id);
      }

      let currentParentId = element.parentId ?? null;
      const visitedAncestors = new Set<string>();
      while (currentParentId) {
        if (visitedAncestors.has(currentParentId)) {
          break;
        }
        visitedAncestors.add(currentParentId);

        const parent = elementMap.get(currentParentId);
        if (parent && parent.type === 'group') {
          groupIds.add(parent.id);
          currentParentId = parent.parentId ?? null;
        } else {
          break;
        }
      }
    });

    return Array.from(groupIds)
      .map((groupId) => {
        const group = elementMap.get(groupId);
        if (group && group.type === 'group') {
          const bounds = calculateGroupBounds(group as GroupElement);
          if (bounds) {
            return { id: group.id, bounds };
          }
        }
        return null;
      })
      .filter((value): value is { id: string; bounds: { minX: number; minY: number; maxX: number; maxY: number } } => Boolean(value));
  }, [selectedIds, elementMap, calculateGroupBounds]);

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
        logger.debug('Emergency cleanup triggered - force stopping drag');
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

  // Native DOM event listeners for pencil tool (bypassing React's synthetic events)
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement || activePlugin !== 'pencil') return;

    // Cleanup any orphaned temp paths from previous sessions
    const orphanedTempPaths = svgElement.querySelectorAll('[data-temp-path="true"]');
    orphanedTempPaths.forEach(path => path.remove());

    let isDrawing = false;
    let tempPath: SVGPathElement | null = null;
    let allPoints: Point[] = [];

    const nativePointerDown = (e: PointerEvent) => {
      e.stopPropagation(); // Prevent React's handler from receiving this
      const point = screenToCanvas(e.clientX, e.clientY);
      isDrawing = true;
      allPoints = [point];

      // Create temporary SVG path for immediate visual feedback
      tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const { strokeWidth, strokeColor, strokeOpacity } = useCanvasStore.getState().pencil;
      const currentZoom = useCanvasStore.getState().viewport.zoom;
      const effectiveStrokeColor = strokeColor === 'none' ? '#000000' : strokeColor;
      
      tempPath.setAttribute('fill', 'none');
      tempPath.setAttribute('stroke', effectiveStrokeColor);
      tempPath.setAttribute('stroke-width', (strokeWidth / currentZoom).toString());
      tempPath.setAttribute('stroke-opacity', strokeOpacity.toString());
      tempPath.setAttribute('stroke-linecap', 'round');
      tempPath.setAttribute('stroke-linejoin', 'round');
      tempPath.setAttribute('d', `M ${point.x} ${point.y}`);
      tempPath.setAttribute('data-temp-path', 'true'); // Mark as temporary
      tempPath.style.pointerEvents = 'none'; // Prevent interaction
      
      svgElement.appendChild(tempPath);
    };

    const nativePointerMove = (e: PointerEvent) => {
      if (!isDrawing || !tempPath) return;
      e.stopPropagation(); // Prevent React's handler from receiving this

      const point = screenToCanvas(e.clientX, e.clientY);
      allPoints.push(point);

      // Update temporary path with all points
      const pathD = allPoints.map((p, i) => 
        i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
      ).join(' ');
      
      tempPath.setAttribute('d', pathD);
    };

    const nativePointerUp = (e: PointerEvent) => {
      e.stopPropagation(); // Prevent React's handler from receiving this
      if (!isDrawing) return;
      isDrawing = false;

      // Store points before clearing
      const pointsToAdd = [...allPoints];
      
      // Clear state immediately
      allPoints = [];

      // Remove temporary path from DOM immediately
      if (tempPath && tempPath.parentNode) {
        tempPath.parentNode.removeChild(tempPath);
        tempPath = null;
      }

      // Add all points to store
      if (pointsToAdd.length > 0) {
        const state = useCanvasStore.getState();
        state.startPath(pointsToAdd[0]);
        
        // Add remaining points (skip first one as it's used in startPath)
        for (let i = 1; i < pointsToAdd.length; i++) {
          state.addPointToPath(pointsToAdd[i]);
        }
      }
    };

    // Add native event listeners (NOT passive so we can stopPropagation)
    svgElement.addEventListener('pointerdown', nativePointerDown);
    svgElement.addEventListener('pointermove', nativePointerMove);
    svgElement.addEventListener('pointerup', nativePointerUp);
    svgElement.addEventListener('pointercancel', nativePointerUp);

    return () => {
      svgElement.removeEventListener('pointerdown', nativePointerDown);
      svgElement.removeEventListener('pointermove', nativePointerMove);
      svgElement.removeEventListener('pointerup', nativePointerUp);
      svgElement.removeEventListener('pointercancel', nativePointerUp);
      
      // Cleanup temp path if it exists
      if (tempPath && tempPath.parentNode) {
        tempPath.parentNode.removeChild(tempPath);
      }
      
      // Also cleanup any orphaned temp paths
      const tempPaths = svgElement.querySelectorAll('[data-temp-path="true"]');
      tempPaths.forEach(path => path.remove());
    };
  }, [activePlugin, screenToCanvas]);

  // Native DOM event listeners for smooth brush (bypassing React's synthetic events)
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement || activePlugin !== 'edit' || !isSmoothBrushActive) return;

    let isBrushing = false;
    let lastApplyTime = 0;
    const APPLY_THROTTLE = 200; // Apply smooth brush at most every 100ms

    const nativePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // Only left mouse button
      const point = screenToCanvas(e.clientX, e.clientY);
      isBrushing = true;
      lastApplyTime = 0; // Reset throttle
      
      // Apply brush immediately on pointer down
      const state = useCanvasStore.getState();
      state.applySmoothBrush(point.x, point.y);
      lastApplyTime = Date.now();
    };

    const nativePointerMove = (e: PointerEvent) => {
      const point = screenToCanvas(e.clientX, e.clientY);
      
      // Update local cursor position for visual feedback (doesn't cause store re-renders)
      setSmoothBrushCursor({ x: point.x, y: point.y });

      if (!isBrushing) return;

      // Throttle brush applications to reduce re-renders
      const now = Date.now();
      if (now - lastApplyTime >= APPLY_THROTTLE) {
        const state = useCanvasStore.getState();
        state.applySmoothBrush(point.x, point.y);
        lastApplyTime = now;
      }
    };

    const nativePointerUp = () => {
      if (!isBrushing) return;
      isBrushing = false;
      lastApplyTime = 0;
    };

    // Add native event listeners with passive: true for better performance
    svgElement.addEventListener('pointerdown', nativePointerDown, { passive: true });
    svgElement.addEventListener('pointermove', nativePointerMove, { passive: true });
    svgElement.addEventListener('pointerup', nativePointerUp, { passive: true });
    svgElement.addEventListener('pointercancel', nativePointerUp, { passive: true });

    return () => {
      svgElement.removeEventListener('pointerdown', nativePointerDown);
      svgElement.removeEventListener('pointermove', nativePointerMove);
      svgElement.removeEventListener('pointerup', nativePointerUp);
      svgElement.removeEventListener('pointercancel', nativePointerUp);
    };
  }, [activePlugin, isSmoothBrushActive, screenToCanvas]);

  // Handle wheel event with passive: false to allow preventDefault
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = svgElement.getBoundingClientRect();
      if (rect) {
        const centerX = e.clientX - rect.left;
        const centerY = e.clientY - rect.top;
        useCanvasStore.getState().zoom(zoomFactor, centerX, centerY);
      }
    };

    svgElement.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      svgElement.removeEventListener('wheel', wheelHandler);
    };
  }, []);

  // Listen for saveAsPng events from FilePanel
  useEffect(() => {
    const handleSaveAsPng = (event: CustomEvent) => {
      const { selectedOnly } = event.detail;
      if (svgRef.current) {
        saveAsPng(selectedOnly);
      }
    };

    window.addEventListener('saveAsPng', handleSaveAsPng as EventListener);

    return () => {
      window.removeEventListener('saveAsPng', handleSaveAsPng as EventListener);
    };
  }, [saveAsPng]);

  return (
    <>
      <RenderCountBadgeWrapper 
        componentName="Canvas" 
        position="top-left"
        wrapperStyle={{ position: 'fixed', top: 0, left: 0, zIndex: 10000 }}
      />
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
        onDoubleClick={handleCanvasDoubleClick}
      >
      {/* Grid Overlay - At the very bottom */}
      <GridOverlay
        grid={grid}
        viewport={viewport}
        canvasSize={canvasSize}
      />

      {/* Sort elements by zIndex */}
      {sortedElements.map(renderElement)}

      {/* Group selection overlays */}
      {selectedGroupBounds.map(({ id, bounds }) => (
        <rect
          key={`group-selection-${id}`}
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.maxX - bounds.minX}
          height={bounds.maxY - bounds.minY}
          fill="none"
          stroke="#2563eb"
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${6 / viewport.zoom} ${4 / viewport.zoom}`}
          pointerEvents="none"
        />
      ))}

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

      {/* Curves Renderer */}
      {activePlugin === 'curves' && <CurvesRenderer />}

      {/* Smooth Brush Cursor */}
      {activePlugin === 'edit' && isSmoothBrushActive && (
        <ellipse
          cx={smoothBrushCursor.x}
          cy={smoothBrushCursor.y}
          rx={smoothBrush.radius}
          ry={smoothBrush.radius}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.2"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Transformation Overlay */}
      {((selectedIds.length > 0 && selectedSubpaths.length === 0) || selectedSubpaths.length > 0) &&
        (selectedSubpaths.length > 0 ? selectedSubpaths : selectedIds).map(item => {
          const elementId = typeof item === 'string' ? item : item.elementId;
          const element = elements.find(el => el.id === elementId);
          if (!element) return null;

          // Calculate bounds for the element or subpath
          let bounds = null;
          if (element.type === 'path') {
            if (selectedSubpaths.length > 0) {
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
              key={selectedSubpaths.length > 0 ? `subpath-${elementId}-${typeof item === 'string' ? 0 : item.subpathIndex}` : elementId}
              element={element}
              bounds={bounds}
              selectedSubpaths={selectedSubpaths}
              viewport={viewport}
              activePlugin={activePlugin}
              transformation={transformation}
              isWorkingWithSubpaths={selectedSubpaths.length > 0}
              onTransformationHandlerPointerDown={handleTransformationHandlerPointerDown}
              onTransformationHandlerPointerUp={handleTransformationHandlerPointerUp}
            />
          );
        })}

      {/* Guidelines Overlay */}
      {activePlugin === 'select' && guidelines && (isDragging || editingPoint?.isDragging || draggingSelection?.isDragging) && (
        <GuidelinesOverlay
          guidelines={guidelines}
          viewport={viewport}
          elements={elements}
          selectedIds={selectedIds}
        />
      )}

      <FeedbackOverlay
        viewport={viewport}
        canvasSize={canvasSize}
        rotationFeedback={feedback.rotation}
        resizeFeedback={feedback.resize}
        shapeFeedback={shapeFeedback.shape}
        pointPositionFeedback={shapeFeedback.pointPosition}
      />

      {/* Tool-specific overlays */}
      {pluginManager.getGlobalOverlays().map((OverlayComponent, index) => (
        <OverlayComponent key={`global-overlay-${index}`} viewport={viewport} />
      ))}

      {activePlugin && pluginManager.getOverlays(activePlugin).map((OverlayComponent, index) => (
        <OverlayComponent key={`plugin-overlay-${index}`} viewport={viewport} />
      ))}
    </svg>
    </>
  );
};