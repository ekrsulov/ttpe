import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { useCanvasDragInteractions } from '../hooks/useCanvasDragInteractions';
import { useCanvasKeyboardControls } from '../hooks/useCanvasKeyboardControls';
import { useSelectionController } from '../hooks/useSelectionController';
import { useCanvasTransformControls } from '../plugins/transformation/useCanvasTransformControls';
import { useCanvasShapeCreation } from '../hooks/useCanvasShapeCreation';
import { useCanvasSmoothBrush } from '../hooks/useCanvasSmoothBrush';
import { useCanvasEventHandlers } from '../hooks/useCanvasEventHandlers';
import { RenderCountBadgeWrapper } from './ui/RenderCountBadgeWrapper';
import type { Point, CanvasElement } from '../types';
import { useCanvasController } from '../canvas/controller/CanvasControllerContext';
import { CanvasControllerProvider } from '../canvas/controller/CanvasControllerProvider';
import {
  CanvasEventBusProvider,
  useCanvasEventBus,
} from '../canvas/CanvasEventBusContext';
import { useCanvasZoom } from '../hooks/useCanvasZoom';
import { useMobileTouchGestures } from '../hooks/useMobileTouchGestures';
import { CanvasServicesProvider } from '../canvas/services/CanvasServicesProvider';
import { useSmoothBrushIntegration } from '../hooks/useSmoothBrushIntegration';
import { useAddPointNativeListeners } from '../hooks/useAddPointNativeListeners';
import '../canvas/listeners/AddPointListener';
import { useDynamicCanvasSize } from '../hooks/useDynamicCanvasSize';
import { useCanvasSideEffects } from '../hooks/useCanvasSideEffects';
import { useCanvasEventHandlerDeps } from '../hooks/useCanvasEventHandlerDeps';
import { CanvasStage } from './CanvasStage';
import { useCanvasEventBusManager } from '../hooks/useCanvasEventBusManager';
import {
  canvasRendererRegistry,
  type CanvasRenderContext,
} from '../canvas/renderers';
import { usePointerStateController } from '../canvas/interactions/usePointerStateController';
import { useCanvasGeometry } from '../hooks/useCanvasGeometry';
import { useViewportController } from '../hooks/useViewportController';
import { useCanvasShortcuts } from '../hooks/useCanvasShortcuts';
import { canvasShortcutRegistry } from '../canvas/shortcuts';
import { useCanvasModeMachine } from '../hooks/useCanvasModeMachine';
import type { CanvasMode } from '../canvas/modes/CanvasModeMachine';

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
    applyBrush: _applyBrush,
    updateCursorPosition: _updateCursorPosition
  } = useCanvasSmoothBrush();

  const controller = useCanvasController();
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

  // Use smooth brush integration hook
  const {  smoothBrushCursor, canvasServicesValue } = useSmoothBrushIntegration({
    svgRef,
    currentMode,
    pencil: pencil ?? {
      strokeWidth: 4,
      strokeColor: '#000000',
      strokeOpacity: 1,
      fillColor: 'none',
      fillOpacity: 1,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      fillRule: 'nonzero' as const,
      strokeDasharray: 'none',
      reusePath: false,
    },
    viewportZoom: viewport.zoom,
    screenToCanvas,
    emitPointerEvent,
    startPath,
    addPointToPath,
    isSmoothBrushActive,
  });

  // Use add point native listeners
  useAddPointNativeListeners({
    svgRef,
    activePlugin: currentMode,
    isAddPointModeActive: addPointMode?.isActive ?? false,
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
    updateTransformation,
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
    handleElementPointerDown,
    handleTransformationHandlerPointerDown,
    handleTransformationHandlerPointerUp,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleCanvasDoubleClick,
  } = useCanvasEventHandlers(eventHandlerDeps);

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
    },
  }), [
    viewport,
    currentMode,
    isElementHidden,
    isElementLocked,
    isElementSelected,
    transformState.isTransforming,
    isSelecting,
    isCreatingShape,
    handleElementClick,
    handleElementPointerDown,
    handleElementDoubleClick,
  ]);

  const renderElement = (element: typeof elements[0]) =>
    canvasRendererRegistry.render(element, renderContext);

  const canvasLayerContext = useMemo(
    () => ({
      ...controller,
      activePlugin: currentMode,
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
      addPointMode,
      dragPosition,
      isDragging,
      transformFeedback: feedback,
      getElementBounds,
      handleTransformationHandlerPointerDown,
      handleTransformationHandlerPointerUp,
      handleSubpathDoubleClick,
      setDragStart: setDragStartForLayers,
    }),
    [
      controller,
      currentMode,
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
      addPointMode,
      dragPosition,
      isDragging,
      feedback,
      getElementBounds,
      handleTransformationHandlerPointerDown,
      handleTransformationHandlerPointerUp,
      handleSubpathDoubleClick,
      setDragStartForLayers,
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
          handleCanvasDoubleClick={handleCanvasDoubleClick}
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
