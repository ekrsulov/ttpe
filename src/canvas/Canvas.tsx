import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { useCanvasDragInteractions } from './hooks/useCanvasDragInteractions';
import { useCanvasKeyboardControls } from './hooks/useCanvasKeyboardControls';
import { useSelectionController } from './hooks/useSelectionController';
import { useCanvasTransformControls } from './hooks/useCanvasTransformControls';
import { useAdvancedTransformControls } from './hooks/useAdvancedTransformControls';
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
import { PluginHooksRenderer } from './PluginHooks';

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

  const controller = useCanvasController();
  const scaleStrokeWithZoom = useCanvasStore(state => state.settings.scaleStrokeWithZoom);
  const isPathInteractionDisabled = useCanvasStore(state => state.isPathInteractionDisabled);
  const pathCursorMode = useCanvasStore(state => state.pathCursorMode);
  const settings = useCanvasStore(state => state.settings);

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
    updateElement,
    stopDraggingPoint,
    emergencyCleanupDrag,
    isWorkingWithSubpaths,
    getControlPointInfo,
    saveAsPng,
    clearGuidelines,
    isElementHidden,
    isElementLocked,
    moveSelectedElements,
    moveSelectedSubpaths,
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

  const handleMoveSelectedElements = useCallback((deltaX: number, deltaY: number, precisionOverride?: number) => {
    moveSelectedElementsRef.current(deltaX, deltaY, precisionOverride);
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
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
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
          setDragStart,
          setIsDragging,
          setHasDragMoved,
        },
        state: {
          isSelecting: state.isSelecting,
          isDragging: state.isDragging,
          dragStart: state.dragStart,
          hasDragMoved: state.hasDragMoved,
        },
      });
    },
    [eventBus, currentMode, helpers, stateRefs, setDragStart, setIsDragging, setHasDragMoved]
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
    transformStateIsTransforming: transformState.isTransforming,
    advancedTransformStateIsTransforming: advancedTransformState.isTransforming,
    updateTransformation,
    updateAdvancedTransformation,
    beginSelectionRectangle,
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
    moveSelectedElements: handleMoveSelectedElements,
    moveSelectedSubpaths: handleMoveSelectedSubpaths,
    selectElement: handleSelectElement,
    setMode: handleSetMode,
  });

  const {
    handleElementDoubleClick,
    handleSubpathDoubleClick,
    handleElementDoubleTap,
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
    callbacks: {
      onStopDraggingPoint: stopDraggingPoint ?? (() => { }),
      onUpdateElement: updateElement,
      getControlPointInfo: getControlPointInfo ?? (() => null),
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
    scaleStrokeWithZoom,
    isElementHidden,
    isElementLocked,
    isElementSelected,
    isTransforming: transformState.isTransforming,
    isSelecting,
    isPathInteractionDisabled,
    pathCursorMode,
    eventHandlers: {
      onPointerUp: undefined,
      onPointerDown: undefined,
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
    isPathInteractionDisabled,
    pathCursorMode,
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
      settings, // Add settings to context
    };

    // Conditionally add plugin-specific context
    const pluginSpecific: Partial<CanvasLayerContext> = {};
    if (currentMode === 'transformation') {
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
      settings,
      // Plugin-specific dependencies
      feedback,
    ]
  );

  // Use side effects hook to manage feedback, cleanup, and save
  useCanvasSideEffects({
    currentMode,
    selectedCommands: selectedCommands ?? [],
    elements,
    editingPoint: editingPoint ?? null,
    draggingSelection: draggingSelection ?? null,
    emergencyCleanupDrag: emergencyCleanupDrag ?? (() => { }),
    saveAsPng,
    svgRef,
  });

  return (
    <>
      <PluginHooksRenderer
        svgRef={svgRef}
        screenToCanvas={screenToCanvas}
        emitPointerEvent={emitPointerEvent}
      />
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
