import React from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { usePencilDrawing } from './hooks/usePencilDrawing';
import { useEditSmoothBrush } from './hooks/useEditSmoothBrush';
import { useDuplicateOnDrag } from './hooks/useDuplicateOnDrag';
import { useEditAddPoint } from './hooks/useEditAddPoint';
import type { Point } from '../types';
import { startPath, addPointToPath, finalizePath } from '../plugins/pencil/actions';

interface PluginHooksProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  screenToCanvas: (x: number, y: number) => Point;
  emitPointerEvent: (type: 'pointerdown' | 'pointermove' | 'pointerup', event: PointerEvent, point: Point) => void;
}

// Helper to get screenToCanvas (replicated from Canvas.tsx or passed down)
// Since we are inside CanvasControllerProvider, we can use hooks.

const PencilHooks = ({ svgRef, screenToCanvas, emitPointerEvent }: PluginHooksProps) => {
  const pencil = useCanvasStore(state => state.pencil);
  const defaultStrokeColor = useCanvasStore(state => state.settings.defaultStrokeColor);
  const scaleStrokeWithZoom = useCanvasStore(state => state.settings.scaleStrokeWithZoom);
  const viewportZoom = useCanvasStore(state => state.viewport.zoom);
  const currentMode = useCanvasStore(state => state.activePlugin);

  // Default pencil settings if not initialized
  const effectivePencil = pencil ?? {
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
  };

  usePencilDrawing({
    svgRef,
    currentMode: currentMode || 'select',
    pencil: effectivePencil,
    viewportZoom,
    scaleStrokeWithZoom,
    screenToCanvas,
    emitPointerEvent,
    startPath: (point) => startPath(point, useCanvasStore.getState),
    addPointToPath: (point) => addPointToPath(point, useCanvasStore.getState),
    finalizePath: (points) => finalizePath(points, useCanvasStore.getState),
  });

  return null;
};

const EditHooks = ({ svgRef, screenToCanvas, emitPointerEvent }: PluginHooksProps) => {
  const currentMode = useCanvasStore(state => state.activePlugin);
  const isSmoothBrushActive = useCanvasStore(state => state.smoothBrush?.isActive ?? false);

  useEditSmoothBrush({
    svgRef,
    currentMode: currentMode || 'select',
    screenToCanvas,
    emitPointerEvent,
    isSmoothBrushActive,
  });

  const addPointMode = useCanvasStore(state => state.addPointMode);
  const zoom = useCanvasStore(state => state.viewport.zoom);

  useEditAddPoint({
    svgRef,
    activePlugin: currentMode,
    isAddPointModeActive: addPointMode?.isActive ?? false,
    zoom,
    screenToCanvas,
    emitPointerEvent,
  });

  return null;
};

const DuplicateOnDragHooks = ({ svgRef, screenToCanvas }: Omit<PluginHooksProps, 'emitPointerEvent'>) => {
  const currentMode = useCanvasStore(state => state.activePlugin);
  
  useDuplicateOnDrag({
    svgRef,
    currentMode: currentMode || 'select',
    screenToCanvas,
  });

  return null;
};

export const PluginHooksRenderer = ({ svgRef, screenToCanvas, emitPointerEvent }: PluginHooksProps) => {
  const activePlugin = useCanvasStore(state => state.activePlugin);
  
  return (
    <>
      <DuplicateOnDragHooks svgRef={svgRef} screenToCanvas={screenToCanvas} />
      {activePlugin === 'pencil' && (
        <PencilHooks 
          svgRef={svgRef} 
          screenToCanvas={screenToCanvas} 
          emitPointerEvent={emitPointerEvent} 
        />
      )}
      {activePlugin === 'edit' && (
        <EditHooks 
          svgRef={svgRef} 
          screenToCanvas={screenToCanvas} 
          emitPointerEvent={emitPointerEvent} 
        />
      )}
    </>
  );
};
