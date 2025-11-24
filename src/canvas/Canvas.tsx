import React, { useRef, useCallback, useMemo } from 'react';
import { useEventCallback } from '../hooks/useEventCallback';
import { useCanvasDrag } from './hooks/useCanvasDrag';
import { useCanvasKeyboardControls } from './hooks/useCanvasKeyboardControls';
import { useSelectionController } from './hooks/useSelectionController';
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

import { useDynamicCanvasSize } from './hooks/useDynamicCanvasSize';
import { useCanvasFeedback } from './hooks/useCanvasFeedback';
import { useCanvasExport } from './hooks/useCanvasExport';

import { CanvasStage } from './components/CanvasStage';
import { useCanvasEventBusManager } from './hooks/useCanvasEventBusManager';
import {
  canvasRendererRegistry,
  type CanvasRenderContext,
} from './renderers';

import { useCanvasGeometry } from './hooks/useCanvasGeometry';
import { useViewportController } from './hooks/useViewportController';
import { useCanvasShortcuts } from './hooks/useCanvasShortcuts';
import { canvasShortcutRegistry } from './shortcuts';
import { useCanvasModeController } from './hooks/useCanvasModeController';
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

  const controller = useCanvasController();
  const scaleStrokeWithZoom = useCanvasStore(state => state.settings.scaleStrokeWithZoom);
  const isPathInteractionDisabled = useCanvasStore(state => state.isPathInteractionDisabled);
  const pathCursorMode = useCanvasStore(state => state.pathCursorMode);
  const settings = useCanvasStore(state => state.settings);

  const {
    currentMode,
    transition: transitionCanvasMode,
  } = useCanvasModeController();
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
    isWorkingWithSubpaths,
    getControlPointInfo,
    saveAsPng,
    clearGuidelines,
    isElementHidden,
    isElementLocked,
    moveSelectedElements,
    moveSelectedSubpaths,
  } = controller;

  const handleMoveSelectedElements = useEventCallback((deltaX: number, deltaY: number, precisionOverride?: number) => {
    moveSelectedElements(deltaX, deltaY, precisionOverride);
  });

  const handleMoveSelectedSubpaths = useEventCallback((deltaX: number, deltaY: number) => {
    if (moveSelectedSubpaths) {
      moveSelectedSubpaths(deltaX, deltaY);
    }
  });

  const handleSelectElement = useEventCallback((elementId: string, toggle: boolean) => {
    applySelectionChange(elementId, toggle);
  });

  const handleSetMode = useEventCallback((mode: string) => {
    transitionCanvasMode(mode as CanvasMode);
  });

  // Use the custom hook for drag interactions and pointer state
  const {
    isDragging,
    dragStart,
    hasDragMoved,
    setIsDragging,
    setDragStart,
    setHasDragMoved,
    stateRefs,
    helpers,
    dragPosition
  } = useCanvasDrag({
    isSelecting,
    beginSelectionRectangle,
    updateSelectionRectangle,
    completeSelectionRectangle,
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
  const eventHandlers = useCanvasEventHandlers({
    screenToCanvas,
    isSpacePressed,
    activePlugin: currentMode,
    isSelecting,
    selectionStart,
    isDragging,
    dragStart,
    hasDragMoved,
    beginSelectionRectangle,
    setIsDragging,
    setDragStart,
    setHasDragMoved,
    isWorkingWithSubpaths: isWorkingWithSubpaths ?? (() => false),
    selectedSubpaths: selectedSubpaths ?? [],
    selectedIds,
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
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleCanvasDoubleClick,
    handleElementTouchEnd,
    handleSubpathTouchEnd,
    handleCanvasTouchEnd,
  } = eventHandlers;

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
    isSelecting,
    isPathInteractionDisabled,
    pathCursorMode,
    handleElementDoubleClick,
    handleElementTouchEnd,
  ]);

  const renderElement = (element: typeof elements[0]) =>
    canvasRendererRegistry.render(element, renderContext);

  const canvasLayerContext: CanvasLayerContext = useMemo(() => {
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
      handleSubpathDoubleClick,
      handleSubpathTouchEnd,
      setDragStart: setDragStartForLayers,
      settings, // Add settings to context
    };

    return baseContext;
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
      handleSubpathDoubleClick,
      handleSubpathTouchEnd,
      setDragStartForLayers,
      settings,
    ]
  );

  // Use side effects hook to manage feedback, cleanup, and save
  // Use new focused hooks
  useCanvasFeedback({
    currentMode,
    selectedCommands: selectedCommands ?? [],
    elements,
    updatePointPositionFeedback: undefined, // Add if needed, or remove if unused in original
  });

  useCanvasExport({
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
