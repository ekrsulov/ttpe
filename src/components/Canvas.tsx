import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { extractEditablePoints } from '../utils/path';
import { useCanvasDragInteractions } from '../hooks/useCanvasDragInteractions';
import { useCanvasKeyboardControls } from '../hooks/useCanvasKeyboardControls';
import { useSelectionController } from '../hooks/useSelectionController';
import { useCanvasTransformControls } from '../plugins/transformation/useCanvasTransformControls';
import { useCanvasShapeCreation } from '../hooks/useCanvasShapeCreation';
import { useCanvasSmoothBrush } from '../hooks/useCanvasSmoothBrush';
import { useCanvasEventHandlers } from '../hooks/useCanvasEventHandlers';
import { pluginManager } from '../utils/pluginManager';
import { logger } from '../utils';
import { RenderCountBadgeWrapper } from './ui/RenderCountBadgeWrapper';
import type { Point, PathData, CanvasElement } from '../types';
import { useCanvasController } from '../canvas/controller/CanvasControllerContext';
import { CanvasControllerProvider } from '../canvas/controller/CanvasControllerProvider';
import { CanvasLayers } from './CanvasLayers';
import {
  CanvasEventBusProvider,
  CanvasEventBus,
  useCanvasEventBus,
} from '../canvas/CanvasEventBusContext';
import { useCanvasZoom } from '../hooks/useCanvasZoom';
import { useSmoothBrushNativeListeners } from '../hooks/useSmoothBrushNativeListeners';
import { SmoothBrushNativeService } from '../canvas/services/SmoothBrushNativeService';
import { CanvasServicesProvider } from '../canvas/services/CanvasServicesProvider';
import {
  canvasRendererRegistry,
  type CanvasRenderContext,
} from '../canvas/renderers';
import { usePointerStateController } from '../canvas/interactions/usePointerStateController';
import { useCanvasGeometry } from '../hooks/useCanvasGeometry';
import { useViewportController } from '../hooks/useViewportController';

const CanvasContent: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { isSpacePressed } = useCanvasKeyboardControls();
  const {
    isSelecting,
    selectionStart,
    selectionEnd,
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
    selectElement: applySelectionChange,
  } = useSelectionController();
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
  const { viewport, screenToCanvas: mapScreenPointToCanvas, getViewBoxString } = useViewportController();
  const eventBus = useCanvasEventBus();

  const {
    elements,
    sortedElements,
    elementMap,
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
    setMode,
    startPath,
    addPointToPath,
  } = controller;

  const moveSelectedElementsRef = useRef(moveSelectedElements);
  const moveSelectedSubpathsRef = useRef(moveSelectedSubpaths);
  const selectElementRef = useRef(applySelectionChange);
  const setModeRef = useRef(setMode);

  useEffect(() => {
    moveSelectedElementsRef.current = moveSelectedElements;
  }, [moveSelectedElements]);

  useEffect(() => {
    moveSelectedSubpathsRef.current = moveSelectedSubpaths;
  }, [moveSelectedSubpaths]);

  useEffect(() => {
    selectElementRef.current = applySelectionChange;
  }, [applySelectionChange]);

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
  
  const {
    isDragging,
    dragStart,
    hasDragMoved,
    setIsDragging,
    setDragStart,
    setHasDragMoved,
    stateRefs,
    helpers,
  } = usePointerStateController({
    isSelecting,
    isCreatingShape,
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
    startShapeCreation,
    updateShapeCreation,
    endShapeCreation,
    isSmoothBrushActive,
  });

  const emitPointerEvent = useCallback(
    (type: 'pointerdown' | 'pointermove' | 'pointerup', event: PointerEvent, point: Point) => {
      const helpersSnapshot = helpers.current;
      const state = stateRefs.pointer.current;
      const target = (event.target as Element) ?? null;

      eventBus.emit(type, {
        event,
        point,
        target,
        activePlugin,
        helpers: {
          beginSelectionRectangle: helpersSnapshot.beginSelectionRectangle,
          updateSelectionRectangle: helpersSnapshot.updateSelectionRectangle,
          completeSelectionRectangle: helpersSnapshot.completeSelectionRectangle,
          startShapeCreation: helpersSnapshot.startShapeCreation,
          updateShapeCreation: helpersSnapshot.updateShapeCreation,
          endShapeCreation: helpersSnapshot.endShapeCreation,
          isSmoothBrushActive: helpersSnapshot.isSmoothBrushActive,
        },
        state: {
          isSelecting: state.isSelecting,
          isCreatingShape: state.isCreatingShape,
          isDragging: state.isDragging,
          dragStart: state.dragStart,
        },
      });
    },
    [eventBus, activePlugin, helpers, stateRefs]
  );

  const setDragStartForLayers = useCallback((point: Point | null) => {
    setDragStart(point);
  }, [setDragStart]);
  
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

  // Transform screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Point => {
      return mapScreenPointToCanvas(svgRef.current, screenX, screenY);
    },
    [mapScreenPointToCanvas]
  );

  // Helper function to get element bounds considering current transform
  const { getElementBounds, getTransformedBounds, selectedGroupBounds } = useCanvasGeometry({
    elementMap,
    viewport,
    selectedIds,
    isElementHidden,
  });

  useCanvasZoom(svgRef);

  useSmoothBrushNativeListeners({
    svgRef,
    activePlugin,
    isSmoothBrushActive,
    screenToCanvas,
    emitPointerEvent,
    setSmoothBrushCursor,
  });

  const defaultSmoothBrushService = useMemo(
    () => new SmoothBrushNativeService(),
    []
  );
  const [smoothBrushServiceOverride, setSmoothBrushServiceOverride] = useState<SmoothBrushNativeService | null>(
    null
  );
  const activeSmoothBrushService = smoothBrushServiceOverride ?? defaultSmoothBrushService;

  const registerSmoothBrushService = useCallback((service: SmoothBrushNativeService) => {
    setSmoothBrushServiceOverride(service);
  }, []);

  const resetSmoothBrushService = useCallback(() => {
    setSmoothBrushServiceOverride(null);
  }, []);

  const canvasServicesValue = useMemo(
    () => ({
      smoothBrushService: activeSmoothBrushService,
      registerSmoothBrushService,
      resetSmoothBrushService,
    }),
    [activeSmoothBrushService, registerSmoothBrushService, resetSmoothBrushService]
  );

  useEffect(() => {
    return activeSmoothBrushService.attachSmoothBrushListeners(svgRef, {
      activePlugin,
      pencil,
      viewportZoom: viewport.zoom,
      screenToCanvas,
      emitPointerEvent,
      startPath,
      addPointToPath,
    });
  }, [
    activeSmoothBrushService,
    svgRef,
    activePlugin,
    pencil,
    viewport.zoom,
    screenToCanvas,
    emitPointerEvent,
    startPath,
    addPointToPath,
  ]);

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
  const isElementSelected = useCallback(
    (elementId: string) => selectedIds.includes(elementId),
    [selectedIds]
  );

  const renderContext = useMemo<CanvasRenderContext>(() => ({
    viewport,
    activePlugin,
    isElementHidden,
    isElementSelected,
    eventHandlers: {
      onPointerUp: handleElementClick,
      onPointerDown: handleElementPointerDown,
      onDoubleClick: handleElementDoubleClick,
    },
  }), [
    viewport,
    activePlugin,
    isElementHidden,
    isElementSelected,
    handleElementClick,
    handleElementPointerDown,
    handleElementDoubleClick,
  ]);

  const renderElement = (element: typeof elements[0]) =>
    canvasRendererRegistry.render(element, renderContext);

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
    <CanvasServicesProvider value={canvasServicesValue}>
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
        viewBox={getViewBoxString(canvasSize)}
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
    </CanvasServicesProvider>
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
