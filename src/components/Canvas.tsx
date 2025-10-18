import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { measurePath, mapPointerToCanvas } from '../utils/geometry';
import { extractEditablePoints, commandsToString } from '../utils/path';
import { useCanvasDragInteractions } from '../hooks/useCanvasDragInteractions';
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
import { useCanvasController } from '../canvas/controller/CanvasControllerContext';
import { CanvasControllerProvider } from '../canvas/controller/CanvasControllerProvider';
import { CanvasLayers } from './CanvasLayers';
import {
  CanvasEventBusProvider,
  CanvasEventBus,
  useCanvasEventBus,
} from '../canvas/CanvasEventBusContext';

const CanvasContent: React.FC = () => {
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
  const [smoothBrushCursor, setSmoothBrushCursor] = useState<Point>({ x: 0, y: 0 });

  // Use shallow selector to prevent unnecessary re-renders
  // Only re-render when values actually change (not just reference)
  const controller = useCanvasController();
  const eventBus = useCanvasEventBus();

  const {
    elements,
    sortedElements,
    elementMap,
    viewport,
    activePlugin,
    selectedIds,
    editingPoint,
    selectedCommands,
    selectedSubpaths,
    draggingSelection,
    pencil,
    updateElement,
    stopDraggingPoint,
    emergencyCleanupDrag,
    isWorkingWithSubpaths,
    getControlPointInfo,
    saveAsPng,
    snapToGrid,
    clearGuidelines,
    isElementHidden,
    moveSelectedElements,
    moveSelectedSubpaths,
    selectElement,
    setMode,
    applySmoothBrush,
    startPath,
    addPointToPath,
    zoom,
  } = controller;

  const moveSelectedElementsRef = useRef(moveSelectedElements);
  const moveSelectedSubpathsRef = useRef(moveSelectedSubpaths);
  const selectElementRef = useRef(selectElement);
  const setModeRef = useRef(setMode);

  useEffect(() => {
    moveSelectedElementsRef.current = moveSelectedElements;
  }, [moveSelectedElements]);

  useEffect(() => {
    moveSelectedSubpathsRef.current = moveSelectedSubpaths;
  }, [moveSelectedSubpaths]);

  useEffect(() => {
    selectElementRef.current = selectElement;
  }, [selectElement]);

  useEffect(() => {
    setModeRef.current = setMode;
  }, [setMode]);

  const handleMoveSelectedElements = useCallback((deltaX: number, deltaY: number) => {
    moveSelectedElementsRef.current(deltaX, deltaY);
  }, []);

  const handleMoveSelectedSubpaths = useCallback((deltaX: number, deltaY: number) => {
    moveSelectedSubpathsRef.current(deltaX, deltaY);
  }, []);

  const handleSelectElement = useCallback((elementId: string, toggle: boolean) => {
    selectElementRef.current(elementId, toggle);
  }, []);

  const handleSetMode = useCallback((mode: string) => {
    setModeRef.current(mode);
  }, []);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [hasDragMoved, setHasDragMoved] = useState(false);

  const pointerStateRef = useRef({
    isSelecting,
    isCreatingShape,
    isDragging,
    dragStart,
  });

  useEffect(() => {
    pointerStateRef.current = {
      isSelecting,
      isCreatingShape,
      isDragging,
      dragStart,
    };
  }, [isSelecting, isCreatingShape, isDragging, dragStart]);

  const pointerHelpersRef = useRef({
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
    startShapeCreation,
    updateShapeCreation,
    endShapeCreation,
    isSmoothBrushActive,
  });

  useEffect(() => {
    pointerHelpersRef.current = {
      beginSelectionRectangle,
      updateSelectionRectangle,
      completeSelectionRectangle,
      startShapeCreation,
      updateShapeCreation,
      endShapeCreation,
      isSmoothBrushActive,
    };
  }, [
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
    startShapeCreation,
    updateShapeCreation,
    endShapeCreation,
    isSmoothBrushActive,
  ]);

  const emitPointerEvent = useCallback(
    (type: 'pointerdown' | 'pointermove' | 'pointerup', event: PointerEvent, point: Point) => {
      const helpers = pointerHelpersRef.current;
      const state = pointerStateRef.current;
      const target = (event.target as Element) ?? null;

      eventBus.emit(type, {
        event,
        point,
        target,
        activePlugin,
        helpers: {
          beginSelectionRectangle: helpers.beginSelectionRectangle,
          updateSelectionRectangle: helpers.updateSelectionRectangle,
          completeSelectionRectangle: helpers.completeSelectionRectangle,
          startShapeCreation: helpers.startShapeCreation,
          updateShapeCreation: helpers.updateShapeCreation,
          endShapeCreation: helpers.endShapeCreation,
          isSmoothBrushActive: helpers.isSmoothBrushActive,
        },
        state: {
          isSelecting: state.isSelecting,
          isCreatingShape: state.isCreatingShape,
          isDragging: state.isDragging,
          dragStart: state.dragStart,
        },
      });
    },
    [eventBus, activePlugin]
  );

  const setDragStartForLayers = useCallback((point: Point | null) => {
    setDragStart(point);
  }, []);
  
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

  // Transform screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Point => {
      return mapPointerToCanvas(svgRef.current, viewport, screenX, screenY);
    },
    [viewport]
  );

  // Helper function to get element bounds considering current transform
  const getElementBounds = useCallback((element: typeof elements[0]) => {
    if (element.type === 'path') {
      const pathData = element.data as import('../types').PathData;
      return measurePath(pathData.subPaths, pathData.strokeWidth, viewport.zoom);
    }
    return null;
  }, [viewport.zoom]);

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
    isWorkingWithSubpaths,
    selectedSubpaths,
    selectedIds,
    startTransformation,
    endTransformation,
    completeSelectionRectangle,
    updateSelectionRectangle,
    updateShapeCreation,
    endShapeCreation,
    moveSelectedElements: handleMoveSelectedElements,
    moveSelectedSubpaths: handleMoveSelectedSubpaths,
    selectElement: handleSelectElement,
    setMode: handleSetMode,
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
    isWorkingWithSubpaths,
    selectedSubpaths,
    selectedIds,
    startTransformation,
    endTransformation,
    completeSelectionRectangle,
    updateSelectionRectangle,
    updateShapeCreation,
    endShapeCreation,
    handleMoveSelectedElements,
    handleMoveSelectedSubpaths,
    handleSelectElement,
    handleSetMode,
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
  const getTransformedBounds = useCallback((element: typeof elements[0]) => {
    if (element.type === 'path') {
      const pathData = element.data as PathData;
      return measurePath(pathData.subPaths, pathData.strokeWidth, viewport.zoom);
    }
    return null;
  }, [viewport.zoom]);

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

  const canvasLayerContext = useMemo(
    () => ({
      ...controller,
      canvasSize,
      isSelecting,
      selectionStart,
      selectionEnd,
      selectedGroupBounds,
      isCreatingShape,
      shapeStart,
      shapeEnd,
      shapeFeedback,
      isSmoothBrushActive,
      smoothBrush,
      smoothBrushCursor,
      dragPosition,
      isDragging,
      transformFeedback: feedback,
      getElementBounds,
      getTransformedBounds,
      handleTransformationHandlerPointerDown,
      handleTransformationHandlerPointerUp,
      handleSubpathDoubleClick,
      setDragStart: setDragStartForLayers,
    }),
    [
      controller,
      canvasSize,
      isSelecting,
      selectionStart,
      selectionEnd,
      selectedGroupBounds,
      isCreatingShape,
      shapeStart,
      shapeEnd,
      shapeFeedback,
      isSmoothBrushActive,
      smoothBrush,
      smoothBrushCursor,
      dragPosition,
      isDragging,
      feedback,
      getElementBounds,
      getTransformedBounds,
      handleTransformationHandlerPointerDown,
      handleTransformationHandlerPointerUp,
      handleSubpathDoubleClick,
      setDragStartForLayers,
    ]
  );

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
      // Don't emit pointerdown event here - it would create an extra path with just M command
      // The actual path will be created in pointerUp with all the collected points
      isDrawing = true;
      allPoints = [point];

      // Create temporary SVG path for immediate visual feedback
      tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const { strokeWidth, strokeColor, strokeOpacity } = pencil;
      const currentZoom = viewport.zoom;
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
      const point = screenToCanvas(e.clientX, e.clientY);
      emitPointerEvent('pointermove', e, point);

      if (!isDrawing || !tempPath) return;
      e.stopPropagation(); // Prevent React's handler from receiving this

      allPoints.push(point);

      // Update temporary path with all points
      const pathD = allPoints.map((p, i) => 
        i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
      ).join(' ');
      
      tempPath.setAttribute('d', pathD);
    };

    const nativePointerUp = (e: PointerEvent) => {
      const point = screenToCanvas(e.clientX, e.clientY);
      emitPointerEvent('pointerup', e, point);

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
        startPath(pointsToAdd[0]);

        // Add remaining points (skip first one as it's used in startPath)
        for (let i = 1; i < pointsToAdd.length; i++) {
          addPointToPath(pointsToAdd[i]);
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
  }, [activePlugin, screenToCanvas, pencil, viewport, startPath, addPointToPath, emitPointerEvent]);

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
      emitPointerEvent('pointerdown', e, point);
      isBrushing = true;
      lastApplyTime = 0; // Reset throttle

      // Apply brush immediately on pointer down
      applySmoothBrush(point.x, point.y);
      lastApplyTime = Date.now();
    };

    const nativePointerMove = (e: PointerEvent) => {
      const point = screenToCanvas(e.clientX, e.clientY);
      emitPointerEvent('pointermove', e, point);

      // Update local cursor position for visual feedback (doesn't cause store re-renders)
      setSmoothBrushCursor({ x: point.x, y: point.y });

      if (!isBrushing) return;

      // Throttle brush applications to reduce re-renders
      const now = Date.now();
      if (now - lastApplyTime >= APPLY_THROTTLE) {
        applySmoothBrush(point.x, point.y);
        lastApplyTime = now;
      }
    };

    const nativePointerUp = (e: PointerEvent) => {
      const point = screenToCanvas(e.clientX, e.clientY);
      emitPointerEvent('pointerup', e, point);

      if (!isBrushing) return;
      isBrushing = false;
      lastApplyTime = 0;
    };

    // Add native event listeners with passive: true for better performance
    svgElement.addEventListener('pointerdown', nativePointerDown, { passive: true });
    svgElement.addEventListener('pointermove', nativePointerMove, { passive: true });
    svgElement.addEventListener('pointerup', nativePointerUp, { passive: true });
    svgElement.addEventListener('pointercancel', nativePointerUp as EventListener, { passive: true });

    return () => {
      svgElement.removeEventListener('pointerdown', nativePointerDown);
      svgElement.removeEventListener('pointermove', nativePointerMove);
      svgElement.removeEventListener('pointerup', nativePointerUp);
      svgElement.removeEventListener('pointercancel', nativePointerUp as EventListener);
    };
  }, [activePlugin, isSmoothBrushActive, screenToCanvas, applySmoothBrush, emitPointerEvent]);

  // Handle wheel event with passive: false to allow preventDefault
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      eventBus.emit('wheel', {
        event: e,
        activePlugin,
        svg: svgElement,
      });
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = svgElement.getBoundingClientRect();
      if (rect) {
        const centerX = e.clientX - rect.left;
        const centerY = e.clientY - rect.top;
        zoom(zoomFactor, centerX, centerY);
      }
    };

    svgElement.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      svgElement.removeEventListener('wheel', wheelHandler);
    };
  }, [zoom, eventBus, activePlugin]);

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
      {/* Sort elements by zIndex */}
      {sortedElements.map(renderElement)}
      <CanvasLayers context={canvasLayerContext} />
    </svg>
    </>
  );
};

export const Canvas: React.FC = () => {
  const eventBusRef = useRef<CanvasEventBus | null>(null);

  if (!eventBusRef.current) {
    eventBusRef.current = new CanvasEventBus();
  }

  useEffect(() => {
    const bus = eventBusRef.current!;
    pluginManager.setEventBus(bus);

    return () => {
      pluginManager.setEventBus(null);
      bus.clear();
    };
  }, []);

  return (
    <CanvasEventBusProvider value={eventBusRef.current}>
      <CanvasControllerProvider>
        <CanvasContent />
      </CanvasControllerProvider>
    </CanvasEventBusProvider>
  );
};
