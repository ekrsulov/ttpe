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
import { pluginManager } from '../utils/pluginManager';

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
    cancelSelection,
  } = useSelectionController();

  const controller = useCanvasController();
  const scaleStrokeWithZoom = useCanvasStore(state => state.settings.scaleStrokeWithZoom);
  const isPathInteractionDisabled = useCanvasStore(state => state.isPathInteractionDisabled);
  const pathCursorMode = useCanvasStore(state => state.pathCursorMode);
  const settings = useCanvasStore(state => state.settings);
  
  // Subscribe to plugin feedback states for overlays
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformFeedback = useCanvasStore(state => (state as any).transformFeedback);
  
  // Subscribe directly to edit dragging state for real-time feedback updates
  // These are separate subscriptions to ensure re-render when drag position changes
  const editingPointFromStore = useCanvasStore(state => state.editingPoint);
  const draggingSelectionFromStore = useCanvasStore(state => state.draggingSelection);
  
  // Subscribe to guidelines state to trigger re-render when it changes
  const guidelines = useCanvasStore(state => state.guidelines);
  // Subscribe to grid state to trigger re-render when it changes
  const grid = useCanvasStore(state => state.grid);
  
  // Get canvas decorators from plugin manager
  const beforeCanvasDecorators = pluginManager.getCanvasDecoratorsByPlacement('before-canvas');
  
  // Calculate visible decorators reactively based on current store state
  const visibleDecorators = useMemo(() => {
    const storeState = useCanvasStore.getState();
    return beforeCanvasDecorators.filter(d => d.isVisible(storeState));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beforeCanvasDecorators, guidelines, grid]);
  
  // Calculate total offset from visible decorators
  const decoratorOffset = useMemo(() => {
    let top = 0;
    let left = 0;
    let width = 0;
    let height = 0;
    
    for (const decorator of visibleDecorators) {
      if (decorator.getOffset) {
        const offset = decorator.getOffset();
        top = Math.max(top, offset.top);
        left = Math.max(left, offset.left);
        width = Math.max(width, offset.width);
        height = Math.max(height, offset.height);
      }
    }
    
    return { top, left, width, height };
  }, [visibleDecorators]);

  const { currentMode } = useCanvasModeController();
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
  const rawCanvasSize = useDynamicCanvasSize();
  
  // Adjust canvas size based on decorator offsets
  const hasDecorators = decoratorOffset.width > 0 || decoratorOffset.height > 0;
  const canvasSize = useMemo(() => {
    if (hasDecorators) {
      return {
        width: rawCanvasSize.width - decoratorOffset.width,
        height: rawCanvasSize.height - decoratorOffset.height,
      };
    }
    return rawCanvasSize;
  }, [rawCanvasSize, hasDecorators, decoratorOffset]);

  // Transform screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Point => {
      return mapScreenPointToCanvas(svgRef.current, screenX, screenY);
    },
    [mapScreenPointToCanvas]
  );

  useCanvasZoom(svgRef);
  useMobileTouchGestures(svgRef, cancelSelection);

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

  // Calculate pointPositionFeedback for edit mode based on dragging state
  // Uses dragPosition from useCanvasDrag hook for real-time updates during drag
  const pointPositionFeedback = useMemo(() => {
    if (currentMode !== 'edit') {
      return { x: 0, y: 0, visible: false };
    }

    // Show feedback when dragging a point - use dragPosition for real-time feedback
    // dragPosition is updated by useCanvasDrag during pointermove events
    const isEditDragging = editingPointFromStore?.isDragging || draggingSelectionFromStore?.isDragging;
    
    if (isEditDragging && dragPosition) {
      return {
        x: Math.round(dragPosition.x),
        y: Math.round(dragPosition.y),
        visible: true,
      };
    }

    return { x: 0, y: 0, visible: false };
  }, [currentMode, editingPointFromStore?.isDragging, draggingSelectionFromStore?.isDragging, dragPosition]);

  // Create shapeFeedback object from transformFeedback for transformation overlay
  // Uses transformFeedback.shape for width/height display
  const shapeFeedback = useMemo(() => {
    if (!transformFeedback) return undefined;
    return {
      shape: transformFeedback.shape,
      pointPosition: transformFeedback.pointPosition,
    };
  }, [transformFeedback]);

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
      settings,
      guidelines, // Add guidelines for plugins that need it
      // Add feedback context for overlays
      pointPositionFeedback,
      transformFeedback,
      shapeFeedback,
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
      guidelines,
      pointPositionFeedback,
      transformFeedback,
      shapeFeedback,
    ]
  );

  // Use new focused hooks for side effects
  useCanvasFeedback({
    currentMode,
    selectedCommands: selectedCommands ?? [],
    elements,
  });

  useCanvasExport({
    saveAsPng,
    svgRef,
  });

  // Create decorator context
  const decoratorContext = useMemo(() => ({
    canvasSize,
    viewport,
    isVisible: true,
  }), [canvasSize, viewport]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Render before-canvas decorators (e.g., rulers) */}
      {visibleDecorators.map(decorator => (
        <React.Fragment key={decorator.id}>
          {decorator.render(decoratorContext)}
        </React.Fragment>
      ))}
      
      {/* Canvas container with offset for decorators */}
      <div style={{
        position: 'absolute',
        top: hasDecorators ? decoratorOffset.top : 0,
        left: hasDecorators ? decoratorOffset.left : 0,
        width: hasDecorators ? `calc(100% - ${decoratorOffset.width}px)` : '100%',
        height: hasDecorators ? `calc(100% - ${decoratorOffset.height}px)` : '100%',
      }}>
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
      </div>
    </div>
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
