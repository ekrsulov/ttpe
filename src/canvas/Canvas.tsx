import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { useCanvasDragInteractions } from './hooks/useCanvasDragInteractions';
import { useCanvasKeyboardControls } from './hooks/useCanvasKeyboardControls';
import { useSelectionController } from './hooks/useSelectionController';
import { useCanvasTransformControls } from './hooks/useCanvasTransformControls';
import { useAdvancedTransformControls } from './hooks/useAdvancedTransformControls';
import { useCanvasShapeCreation } from './hooks/useCanvasShapeCreation';
import { useCanvasSmoothBrush } from './hooks/useCanvasSmoothBrush';
import { useCanvasEventHandlers } from './hooks/useCanvasEventHandlers';
import { RenderCountBadgeWrapper } from '../ui/RenderCountBadgeWrapper';
import type { Point, CanvasElement } from '../types';
import type { CanvasLayerContext } from '../types/plugins';
import { useCanvasController } from './controller/CanvasControllerContext';
import { CanvasControllerProvider } from './controller/CanvasControllerProvider';
import {
  CanvasEventBusProvider,
  useCanvasEventBus,
} from './CanvasEventBusContext';
import { useCanvasZoom } from './hooks/useCanvasZoom';
import { useMobileTouchGestures } from './hooks/useMobileTouchGestures';
import { useElementDoubleTap } from './hooks/useElementDoubleTap';
import { CanvasServicesProvider } from './services/CanvasServicesProvider';
import { useEditSmoothBrush } from './hooks/useEditSmoothBrush';
import { usePencilDrawing } from './hooks/usePencilDrawing';
import { useEditAddPoint } from './hooks/useEditAddPoint';
import { useDuplicateOnDrag } from './hooks/useDuplicateOnDrag';
import './listeners/AddPointListener';
import { useDynamicCanvasSize } from './hooks/useDynamicCanvasSize';
import { useCanvasSideEffects } from './hooks/useCanvasSideEffects';
import { useCanvasEventHandlerDeps } from './hooks/useCanvasEventHandlerDeps';
import { CanvasStage } from './components/CanvasStage';
import { useCanvasEventBusManager } from './hooks/useCanvasEventBusManager';
import {
  canvasRendererRegistry,
  type CanvasRenderContext,
} from './renderers';
import { usePointerStateController } from './hooks/usePointerStateController';
import { useCanvasGeometry } from './hooks/useCanvasGeometry';
import { useViewportController } from './hooks/useViewportController';
import { useCanvasShortcuts } from './hooks/useCanvasShortcuts';
import { canvasShortcutRegistry } from './shortcuts';
import { useCanvasModeMachine } from './hooks/useCanvasModeMachine';
import type { CanvasMode } from './modes/CanvasModeMachine';
import { useCanvasStore } from '../store/canvasStore';

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
    transformState: advancedTransformState,
    startAdvancedTransformation,
    updateAdvancedTransformation,
    endAdvancedTransformation
  } = useAdvancedTransformControls();
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
    applyBrush: _applyBrush,
    updateCursorPosition: _updateCursorPosition
  } = useCanvasSmoothBrush();

  const controller = useCanvasController();
  const defaultStrokeColor = useCanvasStore(state => state.settings.defaultStrokeColor);
  const scaleStrokeWithZoom = useCanvasStore(state => state.settings.scaleStrokeWithZoom);
  const settings = useCanvasStore(state => state.settings);
  const updateDraggingPoint = useCanvasStore(state => state.updateDraggingPoint);
  const objectSnap = useCanvasStore(state => state.objectSnap);
  const measure = useCanvasStore(state => (state as any).measure); // eslint-disable-line @typescript-eslint/no-explicit-any
  const {
    currentMode,
    transition: transitionCanvasMode,
  } = useCanvasModeMachine();
  const { viewport, screenToCanvas: mapScreenPointToCanvas, getViewBoxString } = useViewportController();
  const eventBus = useCanvasEventBus();

  useCanvasShortcuts(canvasShortcutRegistry, svgRef);

  const {
    elements,
    sortedElements,
    elementMap,
    selectedIds,
    editingPoint,
    selectedCommands,
    selectedSubpaths,
    draggingSelection,
    pencil,
    addPointMode,
    updateElement,
    stopDraggingPoint,
    emergencyCleanupDrag,
    isWorkingWithSubpaths,
    getControlPointInfo,
    saveAsPng,
    snapToGrid,
    clearGuidelines,
    isElementHidden,
    isElementLocked,
    moveSelectedElements,
    moveSelectedSubpaths,
    startPath,
    addPointToPath,
    finalizePath,
  } = controller;

  const moveSelectedElementsRef = useRef(moveSelectedElements);
  const moveSelectedSubpathsRef = useRef(moveSelectedSubpaths);
  const selectElementRef = useRef(applySelectionChange);
  const modeTransitionRef = useRef(transitionCanvasMode);

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
    modeTransitionRef.current = transitionCanvasMode;
  }, [transitionCanvasMode]);

  const handleMoveSelectedElements = useCallback((deltaX: number, deltaY: number) => {
    moveSelectedElementsRef.current(deltaX, deltaY);
  }, []);

  const handleMoveSelectedSubpaths = useCallback((deltaX: number, deltaY: number) => {
    if (moveSelectedSubpathsRef.current) {
      moveSelectedSubpathsRef.current(deltaX, deltaY);
    }
  }, []);

  const handleSelectElement = useCallback((elementId: string, toggle: boolean) => {
    selectElementRef.current(elementId, toggle);
  }, []);

  const handleSetMode = useCallback((mode: string) => {
    modeTransitionRef.current(mode as CanvasMode);
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
        activePlugin: currentMode,
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
    [eventBus, currentMode, helpers, stateRefs]
  );

  const setDragStartForLayers = useCallback((point: Point | null) => {
    setDragStart(point);
  }, [setDragStart]);
  
  // Use dynamic canvas size hook
  const canvasSize = useDynamicCanvasSize();

  // Transform screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Point => {
      return mapScreenPointToCanvas(svgRef.current, screenX, screenY);
    },
    [mapScreenPointToCanvas]
  );

  useCanvasZoom(svgRef);
  useMobileTouchGestures(svgRef);

  //  Helper function to get element bounds considering current transform
  const { getElementBounds, selectedGroupBounds } = useCanvasGeometry({
    elementMap,
    viewport,
    selectedIds,
    isElementHidden,
  });

  // Use edit smooth brush hook
  const { smoothBrushCursor } = useEditSmoothBrush({
    svgRef,
    currentMode,
    screenToCanvas,
    emitPointerEvent,
    isSmoothBrushActive,
  });

  // Use duplicate on drag service (always active)
  useDuplicateOnDrag({
    svgRef,
    currentMode,
    screenToCanvas,
  });

  // Use pencil drawing hook
  const { pencilDrawingService, registerPencilDrawingService, resetPencilDrawingService } = usePencilDrawing({
    svgRef,
    currentMode,
    pencil: pencil ?? {
      strokeWidth: 4,
      strokeColor: defaultStrokeColor,
      strokeOpacity: 1,
      fillColor: 'none',
      fillOpacity: 1,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      fillRule: 'nonzero' as const,
      strokeDasharray: 'none',
      reusePath: false,
      simplificationTolerance: 0,
    },
    viewportZoom: viewport.zoom,
    scaleStrokeWithZoom,
    screenToCanvas,
    emitPointerEvent,
    startPath,
    addPointToPath,
    finalizePath,
  });

  // Create canvas services value for provider
  const canvasServicesValue = {
    pencilDrawingService,
    registerPencilDrawingService,
    resetPencilDrawingService,
  };

  // Use edit add point
  useEditAddPoint({
    svgRef,
    activePlugin: currentMode,
    isAddPointModeActive: addPointMode?.isActive ?? false,
    zoom: viewport.zoom,
    screenToCanvas,
    emitPointerEvent,
  });

  // Use event handler deps hook
  const eventHandlerDeps = useCanvasEventHandlerDeps({
    svgRef,
    screenToCanvas,
    isSpacePressed,
    activePlugin: currentMode,
    isSelecting,
    selectionStart,
    isDragging,
    dragStart,
    hasDragMoved,
    isCreatingShape,
    shapeStart,
    transformStateIsTransforming: transformState.isTransforming,
    advancedTransformStateIsTransforming: advancedTransformState.isTransforming,
    updateTransformation,
    updateAdvancedTransformation,
    beginSelectionRectangle,
    startShapeCreation,
    isSmoothBrushActive,
    setIsDragging,
    setDragStart,
    setHasDragMoved,
    isWorkingWithSubpaths: isWorkingWithSubpaths ?? (() => false),
    selectedSubpaths: selectedSubpaths ?? [],
    selectedIds,
    startTransformation,
    endTransformation,
    startAdvancedTransformation,
    endAdvancedTransformation,
    completeSelectionRectangle,
    updateSelectionRectangle,
    updateShapeCreation,
    endShapeCreation,
    moveSelectedElements: handleMoveSelectedElements,
    moveSelectedSubpaths: handleMoveSelectedSubpaths,
    selectElement: handleSelectElement,
    setMode: handleSetMode,
  });

  const {
    handleElementClick,
    handleElementDoubleClick,
    handleSubpathDoubleClick,
    handleElementDoubleTap,
    handleElementPointerDown,
    handleTransformationHandlerPointerDown,
    handleTransformationHandlerPointerUp,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleCanvasDoubleClick,
    handleElementTouchEnd,
    handleSubpathTouchEnd,
    handleCanvasTouchEnd,
  } = useCanvasEventHandlers(eventHandlerDeps);

  // Handle double tap on elements using native DOM events
  useElementDoubleTap({
    svgRef,
    onElementDoubleTap: handleElementDoubleTap,
  });

  // Use the custom hook for drag interactions
  const { dragPosition } = useCanvasDragInteractions({
    dragState: {
      editingPoint: editingPoint ?? null,
      draggingSelection: draggingSelection ?? null
    },
    viewport,
    elements: elements as CanvasElement[],
    smoothBrush,
    callbacks: {
      onStopDraggingPoint: stopDraggingPoint ?? (() => {}),
      onUpdateElement: updateElement,
      getControlPointInfo: getControlPointInfo ?? (() => null),
      snapToGrid,
      clearGuidelines,
      updateDraggingPoint,
    }
  });

  // Helper function to get transformed bounds
  const isElementSelected = useCallback(
    (elementId: string) => selectedIds.includes(elementId),
    [selectedIds]
  );

  const renderContext = useMemo<CanvasRenderContext>(() => ({
    viewport,
    activePlugin: currentMode,
    scaleStrokeWithZoom,
    isElementHidden,
    isElementLocked,
    isElementSelected,
    isTransforming: transformState.isTransforming,
    isSelecting,
    isCreatingShape,
    eventHandlers: {
      onPointerUp: handleElementClick,
      onPointerDown: handleElementPointerDown,
      onDoubleClick: handleElementDoubleClick,
      onTouchEnd: handleElementTouchEnd,
    },
  }), [
    viewport,
    currentMode,
    scaleStrokeWithZoom,
    isElementHidden,
    isElementLocked,
    isElementSelected,
    transformState.isTransforming,
    isSelecting,
    isCreatingShape,
    handleElementClick,
    handleElementPointerDown,
    handleElementDoubleClick,
    handleElementTouchEnd,
  ]);

  const renderElement = (element: typeof elements[0]) =>
    canvasRendererRegistry.render(element, renderContext);

  const canvasLayerContext = useMemo(() => {
    const baseContext = {
      ...controller,
      activePlugin: currentMode,
      canvasSize,
      isSelecting,
      selectionStart,
      selectionEnd,
      selectedGroupBounds,
      dragPosition,
      isDragging,
      getElementBounds,
      handleTransformationHandlerPointerDown,
      handleTransformationHandlerPointerUp,
      handleSubpathDoubleClick,
      handleSubpathTouchEnd,
      setDragStart: setDragStartForLayers,
      objectSnap, // Add objectSnap state to context
      measure, // Add measure state to context
      settings, // Add settings to context
    };

    // Conditionally add plugin-specific context
    const pluginSpecific: Partial<CanvasLayerContext> = {};
    if (currentMode === 'edit') {
      pluginSpecific.isSmoothBrushActive = isSmoothBrushActive;
      pluginSpecific.smoothBrush = smoothBrush;
      pluginSpecific.smoothBrushCursor = smoothBrushCursor;
      pluginSpecific.addPointMode = addPointMode;
      pluginSpecific.pointPositionFeedback = shapeFeedback.pointPosition;
    } else if (currentMode === 'shape') {
      pluginSpecific.isCreatingShape = isCreatingShape;
      pluginSpecific.shapeStart = shapeStart;
      pluginSpecific.shapeEnd = shapeEnd;
      pluginSpecific.shapeFeedback = shapeFeedback;
    } else if (currentMode === 'transformation') {
      pluginSpecific.transformFeedback = feedback;
    }

    return { ...baseContext, ...pluginSpecific };
  },
    [
      controller,
      currentMode,
      canvasSize,
      isSelecting,
      selectionStart,
      selectionEnd,
      selectedGroupBounds,
      dragPosition,
      isDragging,
      getElementBounds,
      handleTransformationHandlerPointerDown,
      handleTransformationHandlerPointerUp,
      handleSubpathDoubleClick,
      handleSubpathTouchEnd,
      setDragStartForLayers,
      objectSnap,
      measure,
      settings,
      // Plugin-specific dependencies
      isCreatingShape,
      shapeStart,
      shapeEnd,
      shapeFeedback,
      isSmoothBrushActive,
      smoothBrush,
      smoothBrushCursor,
      addPointMode,
      feedback,
    ]
  );

  // Use side effects hook to manage feedback, cleanup, and save
  useCanvasSideEffects({
    currentMode,
    selectedCommands: selectedCommands ?? [],
    elements,
    updatePointPositionFeedback,
    editingPoint: editingPoint ?? null,
    draggingSelection: draggingSelection ?? null,
    emergencyCleanupDrag: emergencyCleanupDrag ?? (() => {}),
    saveAsPng,
    svgRef,
  });

  return (
    <CanvasServicesProvider value={canvasServicesValue}>
      <>
        <RenderCountBadgeWrapper
          componentName="Canvas"
          position="top-left"
          wrapperStyle={{ position: 'fixed', top: 0, left: 0, zIndex: 10000 }}
        />
        <CanvasStage
          svgRef={svgRef}
          canvasSize={canvasSize}
          getViewBoxString={getViewBoxString}
          isSpacePressed={isSpacePressed}
          currentMode={currentMode}
          sortedElements={sortedElements}
          renderElement={renderElement}
          canvasLayerContext={canvasLayerContext}
          handlePointerDown={handlePointerDown}
          handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp}
          {...(typeof window !== 'undefined' && !('ontouchstart' in window) && { handleCanvasDoubleClick })}
          {...(typeof window !== 'undefined' && 'ontouchstart' in window && { handleCanvasTouchEnd })}
        />
      </>
    </CanvasServicesProvider>
  );
};

export const Canvas: React.FC = () => {
  const eventBus = useCanvasEventBusManager();

  return (
    <CanvasEventBusProvider value={eventBus}>
      <CanvasControllerProvider>
        <CanvasContent />
      </CanvasControllerProvider>
    </CanvasEventBusProvider>
  );
};
